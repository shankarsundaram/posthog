import { onFilterChange } from 'scenes/insights/filters/BreakdownFilter/taxonomicBreakdownFilterUtils'
import { TaxonomicFilterGroup, TaxonomicFilterGroupType } from 'lib/components/TaxonomicFilter/types'

const taxonomicGroupFor = (
    type: TaxonomicFilterGroupType,
    groupTypeIndex: number | undefined = undefined
): TaxonomicFilterGroup => ({
    type: type,
    groupTypeIndex: groupTypeIndex,
    name: 'unused in these tests',
    searchPlaceholder: 'unused in these tests',
    getName: () => 'unused in these tests',
    getValue: () => 'unused in these tests',
    getPopupHeader: () => 'unused in these tests',
})

const setFilters = jest.fn()

const getPropertyDefinition = jest.fn()

describe('taxonomic breakdown filter utils', () => {
    describe('with multi property breakdown flag on', () => {
        it('sets breakdowns for events', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: true,
                breakdownParts: ['a', 'b'],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 'c'
            const group: TaxonomicFilterGroup = taxonomicGroupFor(TaxonomicFilterGroupType.EventProperties)

            onChange(changedBreakdown, group)

            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'event',
                    breakdowns: [
                        { property: 'a', type: 'event', normalize_url: false },
                        { property: 'b', type: 'event', normalize_url: false },
                        { property: 'c', type: 'event', normalize_url: false },
                    ],
                    breakdown: undefined,
                    breakdown_group_type_index: undefined,
                    breakdown_histogram_bin_count: undefined,
                    breakdown_normalize_url: false,
                },
                true
            )
        })

        it('sets breakdowns for cohorts', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: true,
                breakdownParts: ['all', 1],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 2
            const group: TaxonomicFilterGroup = taxonomicGroupFor(
                TaxonomicFilterGroupType.CohortsWithAllUsers,
                undefined
            )

            onChange(changedBreakdown, group)

            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'cohort',
                    breakdowns: [
                        { property: 'all', type: 'cohort', normalize_url: false },
                        { property: 1, type: 'cohort', normalize_url: false },
                        { property: 2, type: 'cohort', normalize_url: false },
                    ],
                    breakdown_histogram_bin_count: undefined,
                    breakdown_normalize_url: false,
                    breakdown: undefined,
                    breakdown_group_type_index: undefined,
                },
                true
            )
        })

        it('sets breakdowns for person properties', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: true,
                breakdownParts: ['country'],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 'height'
            const group: TaxonomicFilterGroup = taxonomicGroupFor(TaxonomicFilterGroupType.PersonProperties, undefined)

            onChange(changedBreakdown, group)

            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown: undefined,
                    breakdown_type: 'person',
                    breakdowns: [
                        { property: 'country', type: 'person', normalize_url: false },
                        { property: 'height', type: 'person', normalize_url: false },
                    ],
                    breakdown_group_type_index: undefined,
                    breakdown_histogram_bin_count: undefined,
                    breakdown_normalize_url: false,
                },
                true
            )
        })

        // multi property breakdown not implemented for groups
    })

    describe('with single property breakdown', () => {
        it('sets breakdown for events', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: false,
                breakdownParts: ['a', 'b'],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 'c'
            const group: TaxonomicFilterGroup = taxonomicGroupFor(TaxonomicFilterGroupType.EventProperties, undefined)
            onChange(changedBreakdown, group)
            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'event',
                    breakdown: 'c',
                    breakdowns: undefined,
                    breakdown_group_type_index: undefined,
                    breakdown_histogram_bin_count: undefined,
                    breakdown_normalize_url: false,
                },
                true
            )
        })

        it('sets breakdown for cohorts', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: false,
                breakdownParts: ['all', 1],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 2
            const group: TaxonomicFilterGroup = taxonomicGroupFor(
                TaxonomicFilterGroupType.CohortsWithAllUsers,
                undefined
            )
            onChange(changedBreakdown, group)
            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'cohort',
                    breakdown: ['all', 1, 2],
                    breakdowns: undefined,
                    breakdown_group_type_index: undefined,
                    breakdown_normalize_url: false,
                },
                true
            )
        })

        it('sets breakdown for person properties', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: false,
                breakdownParts: ['country'],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = 'height'
            const group: TaxonomicFilterGroup = taxonomicGroupFor(TaxonomicFilterGroupType.PersonProperties, undefined)
            onChange(changedBreakdown, group)
            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'person',
                    breakdown: 'height',
                    breakdowns: undefined,
                    breakdown_group_type_index: undefined,
                    breakdown_normalize_url: false,
                },
                true
            )
        })

        it('sets breakdowns for group properties', () => {
            const onChange = onFilterChange({
                useMultiBreakdown: false,
                breakdownParts: ['$lib'],
                setFilters,
                getPropertyDefinition,
            })
            const changedBreakdown = '$lib_version'
            const group: TaxonomicFilterGroup = taxonomicGroupFor(TaxonomicFilterGroupType.GroupsPrefix, 0)

            onChange(changedBreakdown, group)

            expect(setFilters).toHaveBeenCalledWith(
                {
                    breakdown_type: 'group',
                    breakdowns: undefined,
                    breakdown: '$lib_version',
                    breakdown_group_type_index: 0,
                    breakdown_normalize_url: false,
                },
                true
            )
        })
    })
})
