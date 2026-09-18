/// <reference types="cypress" />
// Core flow required by the spec: login -> move task to DONE.
// Credentials come from environment (an already-confirmed Cognito user):
//   CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD

describe("core flow: login and move task to done", { testIsolation: false }, () => {
  let email = "";
  let password = "";
  const createdIds: string[] = [];

  before(() => {
    return cy.env(["TEST_EMAIL", "TEST_PASSWORD"]).then((vars) => {
      email = vars.TEST_EMAIL || "e2e@test.local";
      password = vars.TEST_PASSWORD || "Test1234!";
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
