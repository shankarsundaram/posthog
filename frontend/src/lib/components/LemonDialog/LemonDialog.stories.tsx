import { ComponentMeta, ComponentStory } from '@storybook/react'
import { LemonDialog, LemonDialogProps } from './LemonDialog'
import { LemonButton } from '../LemonButton'
import { Link } from '@posthog/lemon-ui'
import { CodeSnippet, Language } from 'lib/components/CodeSnippet'

export default {
    title: 'Lemon UI/Lemon Dialog',
    component: LemonDialog,
    args: {
        title: 'Do you want to do the thing?',
        description:
            'This is a simple paragraph that illustrates describing a decision the user is going to take. Dialogs typically ask a single question and provide 1-3 actions for responding. ',

        primaryButton: {
            children: 'Primary',
            onClick: () => alert('Primary Clicked!'),
        },

        secondaryButton: {
            children: 'Secondary',
            onClick: () => alert('Secondary Clicked!'),
        },

        tertiaryButton: {
            children: 'Tertiary',
            onClick: () => alert('Tertiary Clicked!'),
        },
    },
    parameters: {
        docs: {
            description: {
                component: `
[Related Figma area](https://www.figma.com/file/Y9G24U4r04nEjIDGIEGuKI/PostHog-Design-System-One?node-id=3139%3A1388)
                
Dialogs are blocking prompts that force a user decision or action. 
When a dialog presents a desctructive choice, the actions should align with that destructive / warning color palette options.

Dialogs are opened imperatively (i.e. calling \`LemonDialog.open()\`) whereas Modals are used declaratively.
            `,
            },
        },
        chromatic: { disableSnapshot: false },
    },
} as ComponentMeta<typeof LemonDialog>

export const Template: ComponentStory<typeof LemonDialog> = (props: LemonDialogProps) => {
    const onClick = (): void => {
        LemonDialog.open(props)
    }
    return (
        <div>
            <div className="bg-default p-4">
                <LemonDialog {...props} inline />
            </div>

            <LemonButton type="primary" onClick={() => onClick()} className="mx-auto mt-2">
                Open as Dialog
            </LemonButton>

            <h3>Usage</h3>
            <CodeSnippet language={Language.JavaScript}>
                {`LemonDialog.open(${JSON.stringify(props, null, 2)})`}
            </CodeSnippet>
        </div>
    )
}

export const Minimal = Template.bind({})
Minimal.args = {
    title: 'Notice',
    description: undefined,
    primaryButton: undefined,
    secondaryButton: undefined,
    tertiaryButton: undefined,
}

export const Customised = Template.bind({})
Customised.args = {
    title: 'Are you sure you want to delete “FakeOrganization”?',
    description: (
        <>
            This action cannot be undone. If you opt to delete the organization and its corresponding events, the events
            will not be immediately removed. Instead these events will be deleted on a set schedule during non-peak
            usage times. <Link to="https://posthog.com">Learn more</Link>
        </>
    ),
    primaryButton: {
        children: 'Delete organization',
        status: 'danger',
        onClick: () => alert('Organization Deleted!'),
    },

    secondaryButton: {
        children: 'Cancel',
        onClick: () => alert('Cancelled!'),
    },

    tertiaryButton: {
        children: 'Delete organization and all corresponding events',
        status: 'danger',
        onClick: () => alert('Organization and all events deleted!'),
    },
}
