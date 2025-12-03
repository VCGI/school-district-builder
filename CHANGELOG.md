## 

## \[0.2.13\] \- [2025-10-23]

### Fixed
- Improved data handling for map tooltips to ensure proper display of special characters.
- Enhanced robustness of URL state loading by adding size limits and improved validation.
- Updated dependencies for general improvements.

### Removed
- Removed unused legacy report file (`public/report.html`).


---

## **\[0.2.12\] \- 2025-10-10**

### **Enhancements**

* **Report Table Formatting:**  
  * The Public Schools table in the report has been reformatted for better readability. The town name now appears in italics below the school name, removing the need for a separate "Town" column.  
  * The "Enrollment" column title is now "Enrollment (K-12)" for added clarity.  
* **Detailed Grade Information**: The "Grades" column in the report now offers more detail by including special designations like PK, EE, and AE in parentheses (e.g., "K-6 (PK, EE)"), based on newly integrated `GradesList` data.

### **Changed**

* **10-Year Change Data Source**: The 10-year student enrollment change metric is now sourced from more recent, town-level resident ADM data (`VT_School_Geo.json`). This provides a more accurate historical trend than the previous method of aggregating individual school enrollments.  
* **Updated School Enrollment Data**: Individual school enrollment data, sourced from the `schools_all.json` file, has been updated to the 2024-2025 school year.

### **Fixed**

* **TypeScript Errors**: Resolved internal TypeScript errors to ensure smooth data processing and application stability.

---

## **\[0.2.11\] \- 2025-10-02**

### **Enhancements**

* **Report Component Charting Improvements:**  
  * The "Grand List per Student" and "Average Daily Membership" charts now have bar colors that are consistent with the district colors used throughout the application.  
  * Key reference lines and ticks have been added to the "Average Daily Membership" chart at the 4000 and 8000 ADM levels to provide better visual context.  
  * The title of the "Average Daily Membership" chart has been updated to "Average Daily Membership (FY25 PreK-12)" for improved clarity.  
  * The spacing for the x-axis labels on the report charts is now dynamic, which reduces unnecessary white space when district names are short.

