import { PluginEvent } from '@posthog/plugin-scaffold'
import { DateTime } from 'luxon'
import fetch from 'node-fetch'

import { Hook, Hub } from '../../../../src/types'
import { createHub } from '../../../../src/utils/db/hub'
import { UUIDT } from '../../../../src/utils/utils'
import { EventPipelineRunner } from '../../../../src/worker/ingestion/event-pipeline/runner'
import { setupPlugins } from '../../../../src/worker/plugins/setup'
import { delayUntilEventIngested, resetTestDatabaseClickhouse } from '../../../helpers/clickhouse'
import { commonUserId } from '../../../helpers/plugins'
import { insertRow, resetTestDatabase } from '../../../helpers/sql'

jest.mock('../../../../src/utils/status')

describe('Event Pipeline integration test', () => {
    let hub: Hub
    let closeServer: () => Promise<void>

    const ingestEvent = async (event: PluginEvent) => {
        const runner = new EventPipelineRunner(hub, event)
        const result = await runner.runEventPipeline(event)
        const resultEvent = result.args[0]
        return runner.runAsyncHandlersEventPipeline(resultEvent)
    }

    beforeEach(async () => {
        await resetTestDatabase()
        await resetTestDatabaseClickhouse()
        ;[hub, closeServer] = await createHub()

        jest.spyOn(hub.db, 'fetchPerson')
    })

    afterEach(async () => {
        await closeServer()
    })

    it('handles plugins setting properties', async () => {
        await resetTestDatabase(`
            function processEvent (event) {
                event.properties = {
                    ...event.properties,
                    $browser: 'Chrome',
                    processed: 'hell yes'
                }
                event.$set = {
                    ...event.$set,
                    personProp: 'value'
                }
                return event
            }
        `)
        await setupPlugins(hub)

        const event: PluginEvent = {
            event: 'xyz',
            properties: { foo: 'bar' },
            $set: { personProp: 1, anotherValue: 2 },
            timestamp: new Date().toISOString(),
            now: new Date().toISOString(),
            team_id: 2,
            distinct_id: 'abc',
            ip: null,
            site_url: 'https://example.com',
            uuid: new UUIDT().toString(),
        }

        await ingestEvent(event)

        const events = await delayUntilEventIngested(() => hub.db.fetchEvents())
        const persons = await delayUntilEventIngested(() => hub.db.fetchPersons())

        expect(events.length).toEqual(1)
        expect(events[0]).toEqual(
            expect.objectContaining({
                uuid: event.uuid,
                event: 'xyz',
                team_id: 2,
                timestamp: DateTime.fromISO(event.timestamp!, { zone: 'utc' }),
                // :KLUDGE: Ignore properties like $plugins_succeeded, etc
                properties: expect.objectContaining({
                    foo: 'bar',
                    $browser: 'Chrome',
                    processed: 'hell yes',
                    $set: {
                        personProp: 'value',
                        anotherValue: 2,
                    },
                    $set_once: {
                        $initial_browser: 'Chrome',
                    },
                }),
            })
        )

        expect(persons.length).toEqual(1)
        expect(persons[0].version).toEqual(0)
        expect(persons[0].properties).toEqual({
            $creator_event_uuid: event.uuid,
            $initial_browser: 'Chrome',
            personProp: 'value',
            anotherValue: 2,
        })
    })

    it('fires a webhook', async () => {
        await hub.db.postgresQuery(
            `UPDATE posthog_team SET slack_incoming_webhook = 'https://webhook.example.com/'`,
            [],
            'testTag'
        )

        const event: PluginEvent = {
            event: 'xyz',
            properties: { foo: 'bar' },
            timestamp: new Date().toISOString(),
            now: new Date().toISOString(),
            team_id: 2,
            distinct_id: 'abc',
            ip: null,
            site_url: 'https://example.com',
            uuid: new UUIDT().toString(),
        }
        await hub.actionManager.reloadAllActions()

        await ingestEvent(event)

        const expectedPayload = {
            text: '[Test Action](https://example.com/action/69) was triggered by [abc](https://example.com/person/abc)',
        }

        expect(fetch).toHaveBeenCalledWith('https://webhook.example.com/', {
            body: JSON.stringify(expectedPayload, undefined, 4),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            timeout: 10000,
        })
    })

    it('fires a REST hook', async () => {
        const timestamp = new Date().toISOString()

        await hub.db.postgresQuery(`UPDATE posthog_organization SET available_features = '{"zapier"}'`, [], 'testTag')
        await insertRow(hub.db.postgres, 'ee_hook', {
            id: 'abc',
            team_id: 2,
            user_id: commonUserId,
            resource_id: 69,
            event: 'action_performed',
            target: 'https://rest-hooks.example.com/',
            created: timestamp,
            updated: timestamp,
        } as Hook)

        const event: PluginEvent = {
            event: 'xyz',
            properties: { foo: 'bar' },
            timestamp: timestamp,
            now: timestamp,
            team_id: 2,
            distinct_id: 'abc',
            ip: null,
            site_url: 'https://example.com',
            uuid: new UUIDT().toString(),
        }
        await hub.actionManager.reloadAllActions()

        await ingestEvent(event)

        const expectedPayload = {
            hook: {
                id: 'abc',
                event: 'action_performed',
                target: 'https://rest-hooks.example.com/',
            },
            data: {
                event: 'xyz',
                properties: {
                    foo: 'bar',
                },
                eventUuid: expect.any(String),
                timestamp,
                teamId: 2,
                distinctId: 'abc',
                ip: null,
                elementsList: [],
                person: {
                    id: expect.any(Number),
                    created_at: expect.any(String),
                    team_id: 2,
                    properties: {
                        $creator_event_uuid: event.uuid,
                    },
                    uuid: expect.any(String),
                },
            },
        }

        // Using a more verbose way instead of toHaveBeenCalledWith because we need to parse request body
        // and use expect.any for a few payload properties, which wouldn't be possible in a simpler way
        expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://rest-hooks.example.com/')
        const secondArg = jest.mocked(fetch).mock.calls[0][1]
        expect(JSON.parse(secondArg!.body as unknown as string)).toStrictEqual(expectedPayload)
        expect(JSON.parse(secondArg!.body as unknown as string)).toStrictEqual(expectedPayload)
        expect(secondArg!.headers).toStrictEqual({ 'Content-Type': 'application/json' })
        expect(secondArg!.method).toBe('POST')
    })

    it('loads person data once', async () => {
        const event: PluginEvent = {
            event: 'xyz',
            properties: { foo: 'bar' },
            timestamp: new Date().toISOString(),
            now: new Date().toISOString(),
            team_id: 2,
            distinct_id: 'abc',
            ip: null,
            site_url: 'https://example.com',
            uuid: new UUIDT().toString(),
        }

        await new EventPipelineRunner(hub, event).runEventPipeline(event)

        expect(hub.db.fetchPerson).toHaveBeenCalledTimes(1)
    })

    describe('$snapshot event', () => {
        it('processing never loads person data', async () => {
            const event: PluginEvent = {
                event: '$snapshot',
                properties: { $session_id: 'abcf-efg', $snapshot_data: { timestamp: 123 } },
                timestamp: new Date().toISOString(),
                now: new Date().toISOString(),
                team_id: 2,
                distinct_id: 'abc',
                ip: null,
                site_url: 'https://example.com',
                uuid: new UUIDT().toString(),
            }

            await ingestEvent(event)

            expect(hub.db.fetchPerson).not.toHaveBeenCalled()
        })
    })
})
