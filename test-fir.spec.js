const { test, expect } = require('@playwright/test');

test.describe('FIR Management System - Integration Test', () => {
  let consoleErrors = [];
  
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
    page.on('requestfailed', request => {
      consoleErrors.push(`Failed to load resource: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Full FIR registration and update flow', async ({ page }) => {
    // 1. Login as Police
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/FIR Management System/);
    
    // Select Police role
    await page.click('[data-role="police"]');
    
    // Fill credentials
    await page.fill('#identifierInput', 'police');
    await page.fill('#passwordInput', 'police123');
    
    // Submit login
    await page.click('#loginSubmit');
    
    // Wait for redirect to app.html
    await page.waitForURL('**/app**');
    await expect(page.locator('#firWho')).toContainText('Meera Vance');
    
    // 2. Navigate to "Register FIR" page
    await page.click('a[href="#/police/register"]');
    await expect(page.locator('h2:has-text("FIR Information")')).toBeVisible();
    
    // 3. Fill out FIR form
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentTime = today.toTimeString().slice(0, 5);
    
    // FIR Information
    await page.selectOption('#firStation', 'Central HQ Command');
    await page.selectOption('#firCaseType', 'Theft / Burglary');
    await page.fill('#firIpc', 'Sec. 379 IPC');
    await page.fill('#firIncidentDate', todayStr);
    await page.fill('#firIncidentTime', currentTime);
    await page.fill('#firLocation', 'Test Location');
    
    // Complainant
    await page.fill('#firComplainantName', 'Test Complainant');
    await page.fill('#firComplainantPhone', '9876543210');
    
    // Incident Details
    await page.fill('#firDescription', 'Test FIR created via integration test');
    
    // Officer & Status
    await page.selectOption('#firPriority', 'High');
    
    // 4. Submit the FIR
    await page.click('button[type="submit"][form="formRegisterFir"]');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // 5. Verify it redirects to case detail page (not "undefined")
    await page.waitForURL(/\/police\/case\/FIR-\d+/);
    const url = page.url();
    expect(url).not.toContain('undefined');
    
    // Get the FIR ID from URL
    const firIdMatch = url.match(/\/police\/case\/(FIR-\d+)/);
    expect(firIdMatch).toBeTruthy();
    const firId = firIdMatch[1];
    console.log('Created FIR ID:', firId);
    
    // Verify case detail page shows correct info
    await expect(page.locator('.font-code-case-id').first()).toContainText('FIR/');
    await expect(page.locator('h1')).toContainText('Theft / Burglary');
    await expect(page.locator('text=Test Location')).toBeVisible();
    await expect(page.locator('.font-label-lg:text-is("Test Complainant")').first()).toBeVisible();
    
    // 6. Verify the new FIR appears in "My Cases" list
    await page.click('a[href="#/police/cases"]');
    await expect(page.locator(`a[href="#/police/case/${firId}"]`)).toBeVisible();
    await expect(page.locator(`a[href="#/police/case/${firId}"]`)).toContainText('Theft / Burglary');
    
    // 7. Go to case detail and add an update
    await page.click(`a[href="#/police/case/${firId}"]`);
    await page.waitForURL(/\/police\/case\/FIR-\d+/);
    
    // Fill update form
    await page.selectOption('#upStatus', 'Under Investigation');
    await page.fill('#upNote', 'Test update');
    
    // Submit update
    await page.click('button[type="submit"]:has-text("Save Update")');
    
    // Wait for toast success
    await expect(page.locator('.toast-success, [class*="toast"]')).toContainText('updated successfully');
    
    // 8. Verify the update appears in timeline with the note and officer name
    // Find the timeline entry with the new status
    await expect(page.locator('.font-label-md:text-is("Under Investigation")').last()).toBeVisible();
    // The timeline entry has the note in a p tag
    await expect(page.locator('p:has-text("Test update")')).toBeVisible();
    await expect(page.locator('text=Recorded by').first()).toContainText('Meera Vance');
    
    // Final assertion - no console errors
    expect(consoleErrors).toEqual([]);
  });
});