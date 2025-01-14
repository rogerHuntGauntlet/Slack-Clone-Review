describe('RAG Search', () => {
  beforeEach(() => {
    cy.visit('/rag-search');
  });

  it('should load the search page', () => {
    cy.get('h1').should('contain', 'Search Conversation History');
  });

  it('should show filters when clicked', () => {
    cy.contains('button', 'Show Filters').click();
    cy.contains('Channels').should('be.visible');
    cy.contains('Start Date').should('be.visible');
  });

  it('should perform a search', () => {
    const query = 'test query';
    cy.get('input[type="text"]').type(query);
    cy.get('button[type="submit"]').click();
    
    // Check loading state
    cy.contains('Searching through conversations').should('be.visible');
    
    // Wait for response
    cy.get('.bg-white', { timeout: 10000 }).should('exist');
  });

  it('should handle search errors', () => {
    // Intercept the search request and force an error
    cy.intercept('POST', '/api/rag/query', {
      statusCode: 500,
      body: { error: 'Test error' },
    });

    const query = 'error test';
    cy.get('input[type="text"]').type(query);
    cy.get('button[type="submit"]').click();

    // Check error message
    cy.contains('Test error').should('be.visible');
  });

  it('should apply and clear filters', () => {
    // Show filters
    cy.contains('button', 'Show Filters').click();

    // Set date range
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').first().type(today);

    // Clear filters
    cy.contains('button', 'Clear All').click();

    // Verify filters are cleared
    cy.get('input[type="date"]').first().should('have.value', '');
  });
}); 