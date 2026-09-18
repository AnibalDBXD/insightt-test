/// <reference types="cypress" />
// Core flow required by the spec: login -> move task to DONE.
// Credentials come from environment (an already-confirmed Cognito user):
//   CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD
// Cypress 16 removed Cypress.env(); cy.env() keeps credentials in the Node process.
describe("core flow: login and move task to done", () => {
  let email = "";
  let password = "";
  const createdIds: string[] = [];

  before(() => {
    return cy.env(["TEST_EMAIL", "TEST_PASSWORD"]).then((vars) => {
      email = vars.TEST_EMAIL;
      password = vars.TEST_PASSWORD;
      if (!email || !password) {
        throw new Error(
          "Set CYPRESS_TEST_EMAIL and CYPRESS_TEST_PASSWORD to run the E2E flow"
        );
      }
    });
  });

  after(() => {
    // Leave the account clean.
    const token = localStorage.getItem("auth.accessToken");
    createdIds.forEach((id) =>
      cy.request({
        method: "DELETE",
        url: `/api/tasks/${id}`,
        auth: { bearer: token },
        failOnStatusCode: false,
      })
    );
  });

  it("redirects anonymous users to the login page", () => {
    cy.visit("/");
    cy.url().should("include", "/login");
  });

  it("logs in with email and password", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/tasks");
  });

  it("creates a task, moves it through statuses and marks it DONE", () => {
    cy.visit("/tasks");

    cy.get('[data-testid="new-task"]').click();
    cy.get('[data-testid="task-title-input"]').type("Cypress demo task");
    cy.get('form[data-testid="task-dialog"]').submit();
    cy.contains('[data-testid="task-item"]', "Cypress demo task").as("task");

    cy.get("@task").within(() => {
      cy.get('[data-testid="task-status"]').should("contain", "Pending");
      // PENDING -> IN_PROGRESS
      cy.get('[data-testid="status-select"]').click();
    });
    cy.contains('li[role="option"]', "In progress").click();
    cy.get("@task").within(() => {
      cy.get('[data-testid="task-status"]').should("contain", "In progress");
      // IN_PROGRESS -> DONE
      cy.get('[data-testid="mark-done"]').click();
      cy.get('[data-testid="task-status"]').should("contain", "Done");
      // The mark-as-done button is gone once DONE.
      cy.get('[data-testid="mark-done"]').should("not.exist");
    });
  });

  it("rejects an invalid status transition over the API", () => {
    const token = localStorage.getItem("auth.accessToken") as string;
    cy.request({
      method: "POST",
      url: "/api/tasks",
      auth: { bearer: token },
      body: { title: "Cypress API task" },
    })
      .then((res) => {
        createdIds.push(res.body.id);
        return cy.request({
          method: "POST",
          url: `/api/tasks/${res.body.id}/status`,
          auth: { bearer: token },
          body: { status: "DONE" },
          failOnStatusCode: false,
        });
      })
      .its("status")
      .should("eq", 409);
  });
});
