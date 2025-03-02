describe('Security Dashboard', () => {
  beforeEach(() => {
    // Mock the NEAR connection
    cy.window().then((win) => {
      win.localStorage.setItem('accountId', 'test.testnet');
    });

    // Visit the dashboard
    cy.visit('/');
  });

  it('displays security metrics correctly', () => {
    // Check if all metric cards are present
    cy.get('[data-testid="key-age-card"]').should('be.visible');
    cy.get('[data-testid="failed-attempts-card"]').should('be.visible');
    cy.get('[data-testid="last-rotation-card"]').should('be.visible');
    cy.get('[data-testid="contract-status-card"]').should('be.visible');

    // Verify metrics have values
    cy.get('[data-testid="key-age-value"]').should('not.be.empty');
    cy.get('[data-testid="failed-attempts-value"]').should('not.be.empty');
    cy.get('[data-testid="last-rotation-value"]').should('not.be.empty');
    cy.get('[data-testid="contract-status-value"]').should('not.be.empty');
  });

  it('shows recent alerts', () => {
    // Check if alerts section is present
    cy.get('[data-testid="alerts-section"]').should('be.visible');
    
    // Verify alerts are loaded
    cy.get('[data-testid="alert-item"]').should('have.length.at.least', 1);
  });

  it('displays security metrics chart', () => {
    // Check if chart is present
    cy.get('[data-testid="security-metrics-chart"]').should('be.visible');
    
    // Verify chart has data
    cy.get('canvas').should('be.visible');
  });

  it('handles key rotation', () => {
    // Click rotate keys button
    cy.get('[data-testid="rotate-keys-button"]').click();
    
    // Confirm the action
    cy.get('[data-testid="confirm-rotation-dialog"]').should('be.visible');
    cy.get('[data-testid="confirm-rotation-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Check if last rotation time is updated
    cy.get('[data-testid="last-rotation-value"]')
      .invoke('text')
      .should('match', /less than a minute ago/);
  });

  it('acknowledges security alerts', () => {
    // Find an unacknowledged alert
    cy.get('[data-testid="alert-item"]:not(.acknowledged)').first().as('alert');
    
    // Click acknowledge button
    cy.get('@alert').find('[data-testid="acknowledge-button"]').click();
    
    // Verify alert is marked as acknowledged
    cy.get('@alert').should('have.class', 'acknowledged');
  });

  it('updates security settings', () => {
    // Open settings dialog
    cy.get('[data-testid="security-settings-button"]').click();
    
    // Modify settings
    cy.get('[data-testid="max-failed-attempts-input"]')
      .clear()
      .type('5');
    
    cy.get('[data-testid="rotation-frequency-input"]')
      .clear()
      .type('30');
    
    // Save settings
    cy.get('[data-testid="save-settings-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Verify settings are updated
    cy.reload();
    cy.get('[data-testid="max-failed-attempts-input"]')
      .should('have.value', '5');
    cy.get('[data-testid="rotation-frequency-input"]')
      .should('have.value', '30');
  });

  it('tests alert channels', () => {
    // Click test alerts button
    cy.get('[data-testid="test-alerts-button"]').click();
    
    // Verify test alerts are sent
    cy.get('[data-testid="alert-test-dialog"]').should('be.visible');
    cy.get('[data-testid="email-test-status"]').should('contain', 'Success');
    cy.get('[data-testid="webhook-test-status"]').should('contain', 'Success');
  });

  it('displays security logs', () => {
    // Open logs view
    cy.get('[data-testid="view-logs-button"]').click();
    
    // Check date filters
    cy.get('[data-testid="date-range-picker"]').should('be.visible');
    
    // Apply date filter
    cy.get('[data-testid="start-date-input"]').type('2025-02-01');
    cy.get('[data-testid="end-date-input"]').type('2025-02-23');
    cy.get('[data-testid="apply-filter-button"]').click();
    
    // Verify logs are displayed
    cy.get('[data-testid="log-entry"]').should('have.length.at.least', 1);
    
    // Verify log details
    cy.get('[data-testid="log-entry"]').first().click();
    cy.get('[data-testid="log-details-dialog"]').should('be.visible');
  });
});
