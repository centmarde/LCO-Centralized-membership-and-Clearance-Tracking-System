import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

interface User {
  id: string
  email?: string
  created_at?: string
  full_name?: string
  student_number?: string
  role_id?: number
  student_id?: number
  organizations?: Array<{
    id: string
    title: string
  }>
}

interface BlockedEvent {
  status: string
  events?: any
  title?: string
  event_type_name?: string
  event_type?: string
}

// Helper function to get event display name
const getEventTypeDisplay = (event: BlockedEvent): string => {
  if (event.events) {
    const eventData = Array.isArray(event.events) ? event.events[0] : event.events
    return eventData?.title || 'Unknown Event'
  }
  return event.title || event.event_type_name || event.event_type || 'Unknown Event'
}

// Helper function to format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

// Helper function to format organizations
const formatOrganizations = (organizations?: Array<{ id: string; title: string }>): string => {
  if (!organizations || organizations.length === 0) return 'No Organization'
  return organizations.map(org => org?.title || 'Unknown Organization').join(', ')
}

// Export blocked students to PDF
export const exportBlockedStudentsToPDF = (
  blockedStudents: User[],
  studentEventStatusMap: Record<string, BlockedEvent[]>
) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.height
  let yPosition = 20

  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Blocked Students Report', pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 10
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 20

  // Summary
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Total Blocked Students: ${blockedStudents.length}`, 20, yPosition)
  yPosition += 20

  // Student details
  blockedStudents.forEach((student, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage()
      yPosition = 20
    }

    const blockedEvents = (studentEventStatusMap[student.id] || [])
      .filter(event => event.status?.toLowerCase() === 'blocked')

    // Student header
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${index + 1}. ${student.full_name || 'N/A'}`, 20, yPosition)
    yPosition += 7

    // Student details
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Student ID: ${student.student_number || 'N/A'}`, 25, yPosition)
    yPosition += 5
    pdf.text(`Email: ${student.email || 'N/A'}`, 25, yPosition)
    yPosition += 5
    pdf.text(`Organization: ${formatOrganizations(student.organizations)}`, 25, yPosition)
    yPosition += 5
    pdf.text(`Blocked Events: ${blockedEvents.length}`, 25, yPosition)
    yPosition += 8

    // Blocked events list
    if (blockedEvents.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Blocked Events:', 25, yPosition)
      yPosition += 5
      pdf.setFont('helvetica', 'normal')

      blockedEvents.forEach((event, eventIndex) => {
        pdf.text(`• ${getEventTypeDisplay(event)}`, 30, yPosition)
        yPosition += 5

        // Check if we need a new page within events
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
      })
    }

    yPosition += 10 // Space between students
  })

  // Footer with page numbers
  const pageCount = pdf.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10)
  }

  // Save the PDF
  pdf.save(`blocked_students_report_${new Date().toISOString().split('T')[0]}.pdf`)
}

// Export blocked students to DOCX
export const exportBlockedStudentsToDocx = async (
  blockedStudents: User[],
  studentEventStatusMap: Record<string, BlockedEvent[]>
) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "Blocked Students Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Generated date
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString()}`,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Summary
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Blocked Students: ${blockedStudents.length}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Create table for students
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Student Name", bold: true })],
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Student ID", bold: true })],
                    })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Organization", bold: true })],
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Email", bold: true })],
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Blocked Events", bold: true })],
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),

              // Data rows
              ...blockedStudents.map(student => {
                const blockedEvents = (studentEventStatusMap[student.id] || [])
                  .filter(event => event.status?.toLowerCase() === 'blocked')

                const eventsText = blockedEvents.length > 0
                  ? blockedEvents.map(event => getEventTypeDisplay(event)).join(', ')
                  : 'None'

                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: student.full_name || 'N/A' })],
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: student.student_number || 'N/A' })],
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: formatOrganizations(student.organizations) })],
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: student.email || 'N/A' })],
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: eventsText })],
                      })],
                    }),
                  ],
                })
              }),
            ],
          }),

          // Detailed breakdown
          new Paragraph({
            children: [
              new TextRun({
                text: "Detailed Breakdown",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 600, after: 400 },
          }),

          // Individual student details
          ...blockedStudents.flatMap((student, index) => {
            const blockedEvents = (studentEventStatusMap[student.id] || [])
              .filter(event => event.status?.toLowerCase() === 'blocked')

            return [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}. ${student.full_name || 'N/A'}`,
                    bold: true,
                    size: 20,
                  }),
                ],
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Student ID: ${student.student_number || 'N/A'}` }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Organization: ${formatOrganizations(student.organizations)}` }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Email: ${student.email || 'N/A'}` }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Registration Date: ${formatDate(student.created_at)}` }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Number of Blocked Events: ${blockedEvents.length}`, bold: true }),
                ],
                spacing: { after: 200 },
              }),
              ...(blockedEvents.length > 0 ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Blocked Events:", bold: true }),
                  ],
                  spacing: { after: 100 },
                }),
                ...blockedEvents.map(event =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `• ${getEventTypeDisplay(event)}` }),
                    ],
                    spacing: { after: 100 },
                  })
                ),
              ] : [])
            ]
          }),
        ],
      }],
    })

    // Generate and save the document with proper error handling
    const buffer = await Packer.toBlob(doc)
    saveAs(buffer, `blocked_students_report_${new Date().toISOString().split('T')[0]}.docx`)
  } catch (error) {
    console.error('Error generating DOCX:', error)
    throw new Error('Failed to generate DOCX file. Please try again.')
  }
}

// Export blocked students to Excel
export const exportBlockedStudentsToExcel = (
  blockedStudents: User[],
  studentEventStatusMap: Record<string, BlockedEvent[]>
) => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Prepare data for the main sheet
    const worksheetData = [
      // Header row
      ['Student Name', 'Student ID', 'Organization', 'Email', 'Registration Date', 'Blocked Events Count', 'Blocked Events List'],

      // Data rows
      ...blockedStudents.map(student => {
        const blockedEvents = (studentEventStatusMap[student.id] || [])
          .filter(event => event.status?.toLowerCase() === 'blocked')

        const eventsText = blockedEvents.length > 0
          ? blockedEvents.map(event => getEventTypeDisplay(event)).join('; ')
          : 'None'

        return [
          student.full_name || 'N/A',
          student.student_number || 'N/A',
          formatOrganizations(student.organizations),
          student.email || 'N/A',
          formatDate(student.created_at),
          blockedEvents.length,
          eventsText
        ]
      })
    ]

    // Create main worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Student Name
      { wch: 15 }, // Student ID
      { wch: 20 }, // Organization
      { wch: 30 }, // Email
      { wch: 15 }, // Registration Date
      { wch: 15 }, // Blocked Events Count
      { wch: 50 }  // Blocked Events List
    ]

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Blocked Students')

    // Create summary sheet
    const summaryData = [
      ['Blocked Students Report Summary'],
      [''],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Total Blocked Students:', blockedStudents.length],
      [''],
      ['Event Breakdown:'],
      ['Event Type', 'Number of Blocked Students']
    ]

    // Count events by type
    const eventCounts: Record<string, number> = {}
    blockedStudents.forEach(student => {
      const blockedEvents = (studentEventStatusMap[student.id] || [])
        .filter(event => event.status?.toLowerCase() === 'blocked')

      blockedEvents.forEach(event => {
        const eventType = getEventTypeDisplay(event)
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1
      })
    })

    // Add event breakdown to summary
    Object.entries(eventCounts).forEach(([eventType, count]) => {
      summaryData.push([eventType, count])
    })

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWorksheet['!cols'] = [
      { wch: 30 }, // Labels
      { wch: 20 }  // Values
    ]

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary')

    // Save the file
    const fileName = `blocked_students_report_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  } catch (error) {
    console.error('Error generating Excel file:', error)
    throw new Error('Failed to generate Excel file. Please try again.')
  }
}
