// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRandomId} from '../../utils';
import * as TIMEOUTS from '../../fixtures/timeouts';

Cypress.Commands.add('uiCreateChannel', ({
    prefix = 'channel-',
    isPrivate = false,
    purpose = '',
    header = '',
}) => {
    cy.uiBrowseOrCreateChannel('Create New Channel').click();

    cy.get('#newChannelModalLabel').should('be.visible');
    if (isPrivate) {
        cy.get('#private').click().wait(TIMEOUTS.HALF_SEC);
    } else {
        cy.get('#public').click().wait(TIMEOUTS.HALF_SEC);
    }
    const channelName = `${prefix}${getRandomId()}`;
    cy.get('#newChannelName').should('be.visible').clear().type(channelName);
    if (purpose) {
        cy.get('#newChannelPurpose').clear().type(purpose);
    }
    if (header) {
        cy.get('#newChannelHeader').clear().type(header);
    }
    cy.get('#submitNewChannel').click();
    cy.get('#newChannelModalLabel').should('not.exist');
    cy.get('#channelIntro').should('be.visible');
    return cy.wrap({name: channelName});
});

Cypress.Commands.add('uiAddUsersToCurrentChannel', (usernameList) => {
    if (usernameList.length) {
        cy.get('#channelHeaderDropdownIcon').click();
        cy.get('#channelAddMembers').click();
        cy.get('#addUsersToChannelModal').should('be.visible');
        usernameList.forEach((username) => {
            cy.get('#react-select-2-input').type(`@${username}{enter}`);
        });
        cy.get('#saveItems').click();
        cy.get('#addUsersToChannelModal').should('not.exist');
    }
});

Cypress.Commands.add('uiArchiveChannel', () => {
    cy.get('#channelHeaderDropdownIcon').click();
    cy.get('#channelArchiveChannel').click();
    return cy.get('#deleteChannelModalDeleteButton').click();
});

Cypress.Commands.add('uiUnarchiveChannel', () => {
    cy.get('#channelHeaderDropdownIcon').click();
    cy.get('#channelUnarchiveChannel').click();
    return cy.get('#unarchiveChannelModalDeleteButton').click();
});

Cypress.Commands.add('uiLeaveChannel', (isPrivate = false) => {
    cy.get('#channelHeaderDropdownIcon').click();

    if (isPrivate) {
        cy.get('#channelLeaveChannel').click();
        return cy.get('#confirmModalButton').click();
    }

    return cy.get('#channelLeaveChannel').click();
});

Cypress.Commands.add('goToDm', (username) => {
    cy.uiAddDirectMessage().click({force: true});

    // # Start typing part of a username that matches previously created users
    cy.get('#selectItems input').type(username, {force: true});
    cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
    cy.findByRole('textbox', {name: 'Search for people'}).click({force: true})
        .type(username).wait(TIMEOUTS.ONE_SEC)
        .type('{enter}');

    // # Save the selected item
    return cy.get('#saveItems').click().wait(TIMEOUTS.HALF_SEC);
});
