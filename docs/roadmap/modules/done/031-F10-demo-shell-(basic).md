# Module 031: F10 Demo Shell (Basic)

## 1. Purpose
The **Demo Shell** is the initial frontend implementation that demonstrates the Core App's capabilities. It serves as the "Proof of Concept" for the 80/20 architecture, showing how the generic backend supports a specific domain scenario without modification to the core code.

## 2. The "Football League" Scenario
To demonstrate the platform's flexibility, the Demo Shell implements a **Football League Management** interface on top of the generic Core APIs.

### Domain Mapping (The 80/20 Rule)
The frontend translates generic Core concepts into domain-specific terminology:

| Core Concept (Backend) | Football Domain (Frontend) | Business Domain (Alternative) |
|------------------------|----------------------------|-------------------------------|
| **Organization**       | League / Club              | Company / Department          |
| **Project**            | Team / Season              | Project / Cost Center         |
| **Member**             | Staff / Player             | Employee / Contractor         |
| **Event/Log**          | Match Event / Audit        | Work Log / Audit              |

## 3. Key Features
1.  **Organization Switcher**: Users can switch between different "Clubs" (Organizations).
2.  **Team Dashboard**: A view of "Projects" rendered as Football Teams.
3.  **Member Management**: Adding "Players" (Members) to Teams.
4.  **System Health**: Visualizing the `health_check` API status.

## 4. Technical Implementation
- **Framework**: React + Vite (or Next.js as configured).
- **API Client**: Consumes the Django REST Framework endpoints.
- **State Management**: Handles the current "Active Organization" context.
- **Theme**: Uses a basic UI kit (e.g., Tailwind/MUI) to provide a clean look.

## 5. Deliverables
- [x] A running frontend application.
- [x] Login/Logout functionality.
- [x] Dashboard displaying Organizations and Projects.
- [x] "Football Mode" terminology in the UI (labels, headers).
