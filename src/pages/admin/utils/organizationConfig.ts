/**
 * Table configuration for Organizations data table
 */
export const organizationsTableHeaders = [
  { title: 'Organization Name', key: 'title', sortable: true },
  { title: 'Leader', key: 'leader', sortable: true },
  { title: 'Created Date', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
]

/**
 * Form validation rules
 */
export const organizationValidationRules = {
  title: [
    (v: string) => !!v || 'Organization name is required'
  ]
}