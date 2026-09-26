# Mobile Setup & Launch Plan for Savings PWA

This guide outlines the exact steps to get your **Savings** PWA running on your mobile phone (iPhone or Android), connect your Google account, and link your `'Savings'` spreadsheet.

---

## 1. Open the App on Your Phone's Browser

Use your mobile browser to open the shared application URL:

> **App URL:**  
> [https://ais-pre-v2hrf6yj7lzypxdyabuz76-921731801345.europe-west2.run.app](https://ais-pre-v2hrf6yj7lzypxdyabuz76-921731801345.europe-west2.run.app)

*Note: For the best PWA installation experience, open in **Safari on iOS** or **Chrome on Android**.*

---

## 2. Install to Your Phone's Home Screen (PWA)

To run the app as a standalone mobile application without browser toolbars:

### On iPhone (Safari):
1. Tap the **Share** button (the square with an arrow pointing up `⎋`) at the bottom toolbar.
2. Scroll down and tap **Add to Home Screen**.
3. Confirm the name **Savings** and tap **Add** in the top right.
4. Launch the app directly from your home screen icon.

### On Android (Chrome):
1. An **Install App** banner will automatically appear at the top of the screen. Tap **Install**.
2. Alternatively, tap the browser menu (**⋮**) in the top right and select **Add to Home screen** or **Install app**.
3. Launch the app directly from your home screen or app drawer.

---

## 3. Sign In with Your Google Account

1. On the launch screen, tap the white **Sign in with Google** button.
2. Choose your Google account (`mike.brown747@gmail.com`).
3. When prompted, grant permission for the app to access your **Google Sheets** and read **Google Drive** to locate your spreadsheets.
4. Once authenticated, your profile avatar will appear in the top-right corner.

---

## 4. Google Sheet Structure ('Savings' & 'PivotTable')

The app will automatically look for a spreadsheet in your Google Drive named **`Savings`** and read the tab named **`PivotTable`**:

* **Spreadsheet Name:** `Savings` (case-insensitive)
* **Tab Name:** `PivotTable`
* **Column A:** Account names (e.g., *Coop*, *Lloyds Regular Saver*, *eToro (Cash ISA)*)
* **Column B:** Balance / Allocation amounts (powers the *Asset & Account Allocation* progress bar)
* **Interest Column:** A column containing interest earnings (e.g. *Total_Interest* or *Projected Interest*), which automatically powers your **Earnings Chart**

> **Quick Setup / Testing Tip:**  
> If you don't have the spreadsheet created yet, tap **"Create 'Savings' Spreadsheet Now"** inside the app. It will create a ready-to-use template directly in your Google Drive matching your accounts!

---

## 5. Mobile Features & Controls

* **View Mode Selector:** Use the top bar buttons (`All`, `Summary`, `Earnings Chart`, `Pivot Table`) to focus on specific views.
* **Filter by Account Type:** On the Earnings Chart, tap the filter pills (*Regular Saver*, *Cash ISA*, *Building Society*, etc.) to toggle specific account categories.
* **Auto-Sync:** By default, the app automatically polls Google Sheets every 30 seconds (you can change this to 10s, 60s, or Manual).
* **Edit Cells via Google Sheets API:** Tap any data cell in the Pivot Table to change a value with an explicit confirmation step before writing to Google Sheets.
* **Adjust Sheet Range:** Long-press (press and hold for 0.5s) on `Sheet Range: PivotTable!A1:...` in the table footer to customize the cell range (e.g., `PivotTable!A1:E13`).
* **Offline Viewing:** The app automatically caches the latest pivot table snapshot so you can review your savings even when offline.
