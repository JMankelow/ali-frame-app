// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Accident / Incident & Near-Miss Report — digitised from Aliframe's paper Accident Report form (Oct 2026).
// Field ids are stable keys stored in the database; labels can be reworded freely.
// Personal data (address, DOB, sex, injury details) is health information under the Privacy Act 2020: H&S / management only.

export interface Cond {
  field: string;
  equals?: string;
  in?: string[];
  not_in?: string[];
}
export interface IncField {
  id: string;
  label?: string;
  type: string;
  required?: boolean;
  required_if?: Cond;
  show_if?: Cond;
  options?: string[];
  options_extra?: string[];
  exclusive_option?: string;
  rows?: number;
  placeholder?: string;
  help?: string;
  note?: string;
  min?: number;
  max?: number | string;
  step?: number;
  default?: string;
  readonly?: boolean;
  tone?: string;
  text?: string;
  add_label?: string;
  min_rows?: number;
  regions?: string[];
  value_format?: string;
  columns?: { id: string; label: string; type: string; required?: boolean }[];
}
export interface IncSection {
  id: string;
  title: string;
  description?: string;
  show_if?: Cond;
  fields: IncField[];
}

export const INCIDENT_SPEC: { form_id: string; title: string; version: string; sections: IncSection[] } = {
  "form_id": "accident-incident-report",
  "title": "Accident / Incident & Near-Miss Report",
  "version": "1.0",
  "sections": [
    {
      "id": "personal",
      "title": "Personal details",
      "description": "Details of the person who was injured or involved.",
      "fields": [
        {
          "id": "name",
          "label": "Full name",
          "type": "text",
          "required": true
        },
        {
          "id": "phone",
          "label": "Phone number",
          "type": "tel",
          "required": true
        },
        {
          "id": "address",
          "label": "Address",
          "type": "textarea",
          "rows": 2,
          "required": false
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth",
          "type": "date",
          "required": false,
          "max": "today"
        },
        {
          "id": "sex",
          "label": "Sex",
          "type": "radio",
          "required": false,
          "options": [
            "Male",
            "Female"
          ]
        }
      ]
    },
    {
      "id": "employment",
      "title": "Employment details",
      "fields": [
        {
          "id": "site_name",
          "label": "Site / workplace name",
          "type": "text",
          "required": true,
          "note": "Paper form says 'Farm name'. Consider a dropdown of Aliframe sites."
        },
        {
          "id": "job_title",
          "label": "Job title",
          "type": "text",
          "required": true
        },
        {
          "id": "employment_type",
          "label": "Employment type",
          "type": "radio",
          "required": true,
          "options": [
            "Permanent",
            "Casual",
            "Contractor",
            "Visitor"
          ]
        }
      ]
    },
    {
      "id": "accident",
      "title": "Accident details",
      "fields": [
        {
          "id": "accident_date",
          "label": "Date of accident / incident",
          "type": "date",
          "required": true,
          "max": "today"
        },
        {
          "id": "accident_time",
          "label": "Time",
          "type": "time",
          "required": true,
          "note": "Paper form has AM/PM tick boxes; a 24h time picker replaces both."
        },
        {
          "id": "hours_at_work",
          "label": "Hours at work before it happened",
          "type": "number",
          "min": 0,
          "max": 24,
          "step": 0.5,
          "required": false
        },
        {
          "id": "date_reported",
          "label": "Date reported",
          "type": "date",
          "required": true,
          "default": "today",
          "max": "today"
        },
        {
          "id": "outcome",
          "label": "Outcome / treatment",
          "type": "radio",
          "required": true,
          "options": [
            "Near-miss",
            "No treatment",
            "First aid",
            "Doctor",
            "Hospital",
            "Serious harm / notifiable event"
          ]
        },
        {
          "id": "notifiable_notice",
          "type": "notice",
          "tone": "warning",
          "show_if": {
            "field": "outcome",
            "equals": "Serious harm / notifiable event"
          },
          "text": "Tell your manager immediately. Notifiable events must be reported to WorkSafe NZ as soon as possible (0800 030 040) and the scene must not be disturbed unless needed to make it safe or help someone."
        }
      ]
    },
    {
      "id": "injury",
      "title": "Nature of injury",
      "fields": [
        {
          "id": "injury_types",
          "label": "Type of injury (select all that apply)",
          "type": "checkbox",
          "required": true,
          "exclusive_option": "No injury",
          "options": [
            "Strain/sprain",
            "Cut",
            "Head injury",
            "Fracture/break",
            "Gradual process",
            "Bruising",
            "Burns",
            "Poison/chemical",
            "Multiple injuries",
            "No injury"
          ]
        },
        {
          "id": "injury_location",
          "label": "Location of injury",
          "type": "bodymap",
          "help": "Tap the injured area(s) on the body. Left/right are the injured person's own left/right.",
          "required_if": {
            "field": "injury_types",
            "not_in": [
              "No injury"
            ]
          },
          "show_if": {
            "field": "injury_types",
            "not_in": [
              "No injury"
            ]
          },
          "regions": [
            "head",
            "face",
            "neck",
            "shoulder.left",
            "shoulder.right",
            "chest",
            "upper_back",
            "abdomen",
            "lower_back",
            "upper_arm.left",
            "upper_arm.right",
            "forearm.left",
            "forearm.right",
            "hand.left",
            "hand.right",
            "hip_groin",
            "buttocks",
            "thigh.left",
            "thigh.right",
            "knee.left",
            "knee.right",
            "lower_leg.left",
            "lower_leg.right",
            "foot.left",
            "foot.right"
          ],
          "value_format": "<front|back>.<region>[.<left|right>]"
        }
      ]
    },
    {
      "id": "what_happened",
      "title": "What happened",
      "fields": [
        {
          "id": "where",
          "label": "Where did the accident happen?",
          "type": "text",
          "placeholder": "e.g. workshop, loading bay, site address",
          "required": true
        },
        {
          "id": "how",
          "label": "How did the accident happen?",
          "type": "textarea",
          "rows": 5,
          "required": true,
          "placeholder": "Describe what you were doing and what happened, step by step."
        },
        {
          "id": "trained",
          "label": "Was the person trained for the task they were doing?",
          "type": "yesno",
          "required": true
        },
        {
          "id": "vehicle_involved",
          "label": "Was a vehicle involved?",
          "type": "yesno",
          "required": true
        },
        {
          "id": "vehicle_type",
          "label": "Type of vehicle",
          "type": "text",
          "placeholder": "e.g. forklift, ute, truck",
          "show_if": {
            "field": "vehicle_involved",
            "equals": "Yes"
          },
          "required_if": {
            "field": "vehicle_involved",
            "equals": "Yes"
          }
        },
        {
          "id": "significant_risk",
          "label": "Was a significant risk involved?",
          "type": "yesno",
          "required": true
        },
        {
          "id": "significant_risk_detail",
          "label": "What was the significant risk?",
          "type": "textarea",
          "rows": 2,
          "show_if": {
            "field": "significant_risk",
            "equals": "Yes"
          },
          "required_if": {
            "field": "significant_risk",
            "equals": "Yes"
          }
        },
        {
          "id": "on_risk_register",
          "label": "Is the risk on the risk register?",
          "type": "yesno",
          "options_extra": [
            "Not sure"
          ],
          "show_if": {
            "field": "significant_risk",
            "equals": "Yes"
          },
          "required_if": {
            "field": "significant_risk",
            "equals": "Yes"
          }
        }
      ]
    },
    {
      "id": "prevention",
      "title": "Prevention",
      "fields": [
        {
          "id": "potential_harm",
          "label": "What harm could have happened?",
          "type": "textarea",
          "rows": 3,
          "required": true
        },
        {
          "id": "steps_taken",
          "label": "Steps taken to prevent a similar event happening again",
          "type": "textarea",
          "rows": 3,
          "required": false
        },
        {
          "id": "actions",
          "label": "Specific actions required",
          "type": "repeater",
          "min_rows": 0,
          "add_label": "Add action",
          "columns": [
            {
              "id": "action",
              "label": "Action required",
              "type": "text",
              "required": true
            },
            {
              "id": "responsible",
              "label": "Person responsible",
              "type": "text",
              "required": true
            },
            {
              "id": "due_date",
              "label": "By when",
              "type": "date",
              "required": true
            },
            {
              "id": "completed_date",
              "label": "Date completed",
              "type": "date",
              "required": false
            }
          ]
        }
      ]
    },
    {
      "id": "needs",
      "title": "Initial needs assessment",
      "description": "Only complete if a doctor or hospital visit was required.",
      "show_if": {
        "field": "outcome",
        "in": [
          "Doctor",
          "Hospital",
          "Serious harm / notifiable event"
        ]
      },
      "fields": [
        {
          "id": "needs_assessment",
          "label": "Select all that apply",
          "type": "checkbox",
          "required": false,
          "options": [
            "Able to continue full duties",
            "Able to do light duties",
            "Unable to work",
            "Help available at home",
            "Assistance required at home",
            "Transport assistance needed"
          ]
        }
      ]
    },
    {
      "id": "completed_by",
      "title": "Form completed by",
      "fields": [
        {
          "id": "completed_by_name",
          "label": "Name",
          "type": "text",
          "required": true,
          "default": "logged-in user's name"
        },
        {
          "id": "completed_by_position",
          "label": "Position",
          "type": "text",
          "required": true
        },
        {
          "id": "signature",
          "label": "Signature",
          "type": "signature",
          "required": true
        },
        {
          "id": "date_completed",
          "label": "Date form was completed",
          "type": "date",
          "required": true,
          "default": "today",
          "readonly": true
        }
      ]
    }
  ]
};
