# **Vermont School District Builder**

[https://map.vermont.gov/education/district-builder/v01/](https://map.vermont.gov/education/district-builder/v01/)

An interactive web application for creating, visualizing, and sharing custom school district maps for the state of Vermont. This tool is designed for general planning and reference, particularly to meet the requirements of H.454 (Act 73\) of 2025\.

## **Features**

* **Interactive Map:** Assign any of Vermont's towns to custom districts.  
* **Dynamic Data:** Get instant feedback on the number of students, public schools, and Grand List per student for each district you create.  
* **Preset Maps:** Start from a blank slate or use presets.  
* **Share & Collaborate:** Generate a unique, shareable link that saves your entire map configuration, including district names and assignments.  
* **Export Data:**  
  * Download your map as a jpg.  
  * Export all town-to-district assignments as a csv.  
* **Import Assignments:** Load a previously exported CSV file to restore a map configuration.

## **Running the Project Locally**

**Prerequisites:** [Node.js](https://nodejs.org/) (version 14 or higher)

1. **Clone the repository:**  
   git clone https://github.com/vcgijadams/school-district-builder.git  
   cd school-district-builder

2. **Install dependencies:**  
   npm install

3. **Start the development server:**  
   npm run dev

   The application will now be running on http://localhost:5173.

## **Building for Production**

To create an optimized static build of the application, run the following command:

npm run build

The output files will be generated in the dist/ directory. You can then deploy this directory to any static hosting service..

## **Notice & Disclaimer**

* **Informational Use Only:** This application is intended for general planning and reference purposes, and to meet the requirements of [H.454 (Act 73\) of 2025](https://legislature.vermont.gov/bill/status/2026/H.454).  
* **Data Accuracy:** The information provided may contain errors or omissions and should not be considered definitive or official.  
* **Simplified Maps:** To improve performance, features like town boundaries have been simplified and are not precise.