# Technical Documentation: Vermont School District Builder

## 1. Project Overview

This is an interactive, single-page web application for creating, visualizing, and analyzing custom school district maps for the state of Vermont. It allows users to group towns into districts, view real-time demographic and financial data for those districts, and export their work in various formats.

The application is built with a modern web stack, emphasizing a reactive user interface, efficient state management, and clear data presentation. It is designed to be a data exploration tool for planners, educators, and the general public.

---

## 2. Technology Stack

The project is built using the following core technologies:

-   **Framework**: [React](https://reactjs.org/) (v18.3.1)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (v5.4.5)
-   **Build Tool**: [Vite](https://vitejs.dev/) (v7.0.5)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4.4)
-   **Mapping**: [Leaflet](https://leafletjs.com/) (v1.9.4) for interactive maps
-   **Charting**: [Recharts](https://recharts.org/) (v2.12.7) for data visualization
-   **State Management**: Native React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
-   **Data Compression**: [pako](https://github.com/nodeca/pako) (v2.1.0) for compressing URL data
-   **Image Export**: [html2canvas](https://html2canvas.hertzen.com/) (v1.4.1) for generating JPG images of the map

---

## 3. Data Schema

The application relies on two primary data sources fetched from remote URLs.

### 3.1 `VT_School_Geo.json`

This GeoJSON `FeatureCollection` contains the polygonal geometries for each town in Vermont, along with detailed properties for each town. The application uses these properties to populate town-level statistics.

**File Location:** `https://s3.us-east-2.amazonaws.com/vtopendata-prd/_Other/Education/VT_School_Geo.json`

**Schema for `properties` object within each GeoJSON Feature:**

| Property Key                  | Data Type | Description                                                                 | Used in App |
| ----------------------------- | --------- | --------------------------------------------------------------------------- | ----------- |
| `OBJECTID`                    | `number`  | A unique identifier for the town feature.                                   | Yes         |
| `TOWNNAME`                    | `string`  | The official name of the town, in uppercase. Used as the primary key.       | Yes         |
| `County`                      | `string`  | The county the town belongs to.                                             | Yes         |
| `Supervisory_Union`           | `string`  | The supervisory union the town is part of.                                  | Yes         |
| `Public_School_Students`      | `number`  | The number of public school students in the town.                           | Yes         |
| `Total_E_Ed_GL`               | `number`  | The town's total equalized education Grand List value.                      | Yes         |
| `Public_Schools`              | `number`  | The number of public schools located in the town.                           | Yes         |
| `SqMi`                        | `number`  | The area of the town in square miles.                                       | Yes         |
| `Home_E_Ed_GL`                | `number`  | The homestead portion of the equalized education Grand List.                | Yes         |
| `NonHome_E_Ed_GL`             | `number`  | The non-homestead portion of the equalized education Grand List.            | Yes         |
| `RPC`                         | `string`  | The abbreviation for the Regional Planning Commission.                      | Yes         |
| `School_Board_Association`    | `string`  | The School Board Association region.                                        | Yes         |
| `CTE_Region`                  | `string`  | The Career and Technical Education (CTE) region.                            | Yes         |
| `Superintendent_Association_Regi` | `string`  | The Superintendent Association Region.                                  | Yes         |

*This schema is reflected in the `TownProperties` interface in `src/types.ts`.*

### 3.2 `schools.json`

This GeoJSON `FeatureCollection` provides point locations and detailed information for both public and independent schools throughout Vermont.

**File Location:** `https://s3.us-east-2.amazonaws.com/vtopendata-prd/_Other/Education/schools.json`

**Schema for `properties` object within each GeoJSON Feature:**

| Property Key   | Data Type | Description                                                               | Used in App |
| -------------- | --------- | ------------------------------------------------------------------------- | ----------- |
| `School`       | `string`  | The official name of the school.                                          | Yes         |
| `Grades`       | `string`  | The grade levels served by the school (e.g., "K-6", "9-12").              | Yes         |
| `Enrollment`   | `number`  | The number of students enrolled in the school.                            | Yes         |
| `town`         | `string`  | The town where the school is located.                                     | Yes         |
| `Type`         | `string`  | The type of school (e.g., "Elementary", "Secondary", "CTE").              | Yes         |
| `accessType`   | `string`  | Indicates if the school is "Public" or "Independent".                     | Yes         |
| `Status`       | `string`  | The operational status of the school (e.g., "OPEN", "CLOSED").            | Yes         |
| `yearBuilt`    | `number`  | The year the main school building was constructed.                        | Yes         |
| `fciCategory`  | `string`  | The Facility Condition Index category (e.g., "<10%", "10.01-30%").       | Yes         |
| `enrollYear`   | `string`  | The academic year for the provided enrollment data.                       | Yes         |
| `Notes`        | `string`  | Additional notes, primarily for independent schools.                      | Yes         |
| `PCB_Cat`      | `string`  | The PCB testing category (e.g., "Below SAL", "Above SAL", "Not Tested").  | Yes         |

*This schema is reflected in the `SchoolDetail` interface in `src/types.ts`.*

---

## 4. High-Level Architecture

The application follows a component-based architecture centered around a main `App` component that acts as the single source of truth.

-   **Centralized State**: All major application state is held within the `App.tsx` component.
-   **Unidirectional Data Flow**: State is passed down to child components via props.
-   **Callback Functions**: Child components communicate with the `App` component and request state changes via callback functions passed down as props (e.g., `onTownClick`, `onDistrictNameChange`).
-   **Componentization**: The UI is broken down into logical, reusable components (`MapComponent`, `LeftSidebar`, `RightSidebar`, etc.), each with a specific responsibility.

---

## 5. Core Components In-Depth

#### `App.tsx`

This is the most critical component, acting as the application's central controller.

-   **State Management**:
    -   Manages all primary state variables using `useState`, including `townData`, `assignments`, `districtNames`, `schoolDetails`, and UI state like `activeDistrict` and modal visibility.
    -   Calculates derived data, such as `allDistrictStats`, using `useMemo` for performance optimization.
-   **Data Fetching**:
    -   In a `useEffect` hook, it fetches GeoJSON data for towns and school details from the URLs specified in `constants.ts`.
    -   It processes this data to initialize the application's state.
-   **URL State Synchronization**:
    -   `generateShareableString`: Serializes the current district assignments, district names, and map name into a compact string. It uses Run-Length Encoding (RLE) and Base62 encoding for town IDs to create a short, URL-friendly string, which is then compressed with `pako` and Base64-encoded.
    -   `loadStateFromURL`: On page load, this function checks for a `data` parameter in the URL, decodes and decompresses it, and rehydrates the application state to match the shared map.

#### `MapComponent.tsx`

-   **Leaflet Integration**: Wraps the Leaflet library in a React component. It initializes the map and the GeoJSON layer within `useEffect` hooks to correctly manage the Leaflet instance within the React component lifecycle.
-   **Dynamic Styling**: The `getTownStyle` function determines the fill color and border of each town based on its district assignment (`assignments`), and whether its district or supervisory union is being hovered over (`hoveredDistrict`, `hoveredSU`).
-   **Interactivity**: Binds `onClick` events to each town feature on the map, which triggers the `onTownClick` callback from `App.tsx`. It also creates and binds a tooltip to each town.

---

## 6. Build Process

The application is built using **Vite**.

-   **Development**: `npm run dev` starts the Vite development server with Hot Module Replacement (HMR) for a fast development experience.
-   **Production**: `npm run build` uses Vite to bundle the application's assets into optimized static files and places them in the `dist/` directory, ready for deployment.
-   **Base Path**: The `vite.config.ts` file is configured with `base: ''`, which ensures that asset paths in the built HTML are relative. This is crucial for hosting in a subdirectory.

---

## 7. Getting Started

To run the application locally, follow these steps:

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
   
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
   
    This will start the Vite development server. You can view the application in your browser at the specified local address.

---

## 8. Deployment

The application is hosted as a **Static Web App** in **Azure Blob Storage**.

### Deployment Steps

1.  **Build the Application**: First, generate the production-ready static files by running the build command from the project root:
    ```bash
    npm run build
    ```
    This command creates a `dist` folder containing `index.html`, along with the necessary CSS and JavaScript assets.

2.  **Navigate to Azure Storage Account**:
    -   Go to the Azure Portal and navigate to the appropriate Storage Account.
    -   Under the "Data storage" section, select the **`$web`** container, which is designated for hosting static websites.

3.  **Upload Build Artifacts**:
    -   **Upload the entire contents** of the local `dist` folder into the target folder within the `$web` container (e.g., `/education/district-builder/`).
    -   Ensure all files, including subdirectories, are uploaded while maintaining their structure.