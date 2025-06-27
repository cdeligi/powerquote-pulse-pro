
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

describe('Quote Approval Flow E2E Test', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
  });

  it('should complete full quote submission and approval workflow', () => {
    // Step 1: Login as Sales user and submit a quote
    cy.get('[data-cy="login-button"]').click();
    
    // Login as sales user
    cy.get('[data-cy="email-input"]').type('sales@qualitrolcorp.com');
    cy.get('[data-cy="password-input"]').type('password123');
    cy.get('[data-cy="submit-login"]').click();
    
    // Wait for login to complete
    cy.url().should('not.include', '/auth');
    cy.contains('BOM Builder').should('be.visible');
    
    // Navigate to BOM Builder and create a quote
    cy.contains('QTMS').click(); // Use text content instead of data-cy
    
    // Select a chassis
    cy.get('[data-cy="chassis-card"]').first().click();
    
    // Add some cards to slots
    cy.get('[data-cy="slot-1"]').click();
    cy.get('[data-cy="card-selector"]').first().click();
    
    // Add chassis and cards to BOM
    cy.contains('Add Chassis & Cards to BOM').click();
    
    // Fill quote fields
    cy.get('input[placeholder*="Customer"]').type('Test Customer Corp');
    cy.get('input[placeholder*="Oracle"]').type('CUST-12345');
    cy.get('input[placeholder*="SFDC"]').type('OPP-67890');
    
    // Submit quote
    cy.get('[data-cy="submit-quote"]').click();
    
    // Verify quote submission success
    cy.contains('Quote Submitted Successfully').should('be.visible');
    
    // Logout sales user
    cy.get('[data-cy="user-menu"]').click();
    cy.get('[data-cy="logout"]').click();
    
    // Step 2: Login as Admin and verify quote appears in approval dashboard
    cy.get('[data-cy="login-button"]').click();
    
    // Login as admin
    cy.get('[data-cy="email-input"]').type('admin@qualitrolcorp.com');
    cy.get('[data-cy="password-input"]').type('admin123');
    cy.get('[data-cy="submit-login"]').click();
    
    // Navigate to admin panel
    cy.contains('Admin Panel').click();
    cy.contains('Quote Approval').click();
    
    // Verify quote appears in pending approval list
    cy.contains('Test Customer Corp').should('be.visible');
    cy.contains('Pending Approval').should('be.visible');
    
    // Step 3: Test user removal functionality
    cy.contains('Users').click();
    
    // Find a non-admin user and remove them
    cy.get('[data-cy="user-row"]')
      .contains('level1')
      .parent()
      .find('[data-cy="remove-user"]')
      .click();
    
    // Confirm removal
    cy.get('[data-cy="confirm-remove-user"]').click();
    
    // Verify removal success
    cy.contains('User Removed').should('be.visible');
    
    // Step 4: Verify removed user cannot login
    cy.get('[data-cy="user-menu"]').click();
    cy.get('[data-cy="logout"]').click();
    
    // Try to login as removed user
    cy.get('[data-cy="login-button"]').click();
    cy.get('[data-cy="email-input"]').type('removed-user@test.com');
    cy.get('[data-cy="password-input"]').type('password123');
    cy.get('[data-cy="submit-login"]').click();
    
    // Should see error message
    cy.contains('Invalid login credentials').should('be.visible');
  });

  it('should handle quote approval process with enhanced UI', () => {
    // Login as admin
    cy.get('[data-cy="login-button"]').click();
    cy.get('[data-cy="email-input"]').type('admin@qualitrolcorp.com');
    cy.get('[data-cy="password-input"]').type('admin123');
    cy.get('[data-cy="submit-login"]').click();
    
    // Navigate to quote approval
    cy.contains('Admin Panel').click();
    cy.contains('Quote Approval').click();
    
    // Verify enhanced UI elements
    cy.contains('Quote Approval Dashboard').should('be.visible');
    cy.contains('Pending Queue').should('be.visible');
    cy.contains('History').should('be.visible');
    
    // Test expandable quote functionality
    cy.get('[data-cy="quote-row"]').first().click();
    
    // Verify quote details are expanded
    cy.contains('Quote Details').should('be.visible');
    
    // Test approval workflow
    cy.contains('Approve Quote').click();
    cy.get('textarea[placeholder*="approval"]').type('Quote approved for standard pricing');
    cy.contains('Confirm Approval').click();
    
    // Verify approval success
    cy.contains('approved successfully').should('be.visible');
    
    // Check that quote moved to history tab
    cy.contains('History').click();
    cy.contains('Approved').should('be.visible');
  });

  it('should test enhanced quote filtering and search', () => {
    // Login as admin
    cy.get('[data-cy="login-button"]').click();
    cy.get('[data-cy="email-input"]').type('admin@qualitrolcorp.com');
    cy.get('[data-cy="password-input"]').type('admin123');
    cy.get('[data-cy="submit-login"]').click();
    
    // Navigate to quote approval
    cy.contains('Admin Panel').click();
    cy.contains('Quote Approval').click();
    
    // Test search functionality
    cy.get('input[placeholder*="Search"]').type('Test Customer');
    cy.contains('Test Customer').should('be.visible');
    
    // Test status filtering
    cy.get('select').select('approved');
    cy.contains('Approved').should('be.visible');
    
    // Test refresh functionality
    cy.contains('Refresh').click();
    cy.contains('Loading').should('be.visible');
  });
});
