// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components';
import {FormattedMessage, useIntl} from 'react-intl';
import {DateTime} from 'luxon';

import DotMenu, {DropdownMenuItemStyled} from 'src/components/dot_menu';
import {HamburgerButton} from 'src/components/assets/icons/three_dots_icon';
import {getTimestamp} from 'src/components/rhs/rhs_post_update';
import {AnchorLinkTitle} from 'src/components/backstage/playbook_runs/shared';
import {Timestamp} from 'src/webapp_globals';
import {promptUpdateStatus} from 'src/actions';
import {PlaybookRun, PlaybookRunStatus, StatusPostComplete} from 'src/types/playbook_run';
import {useNow} from 'src/hooks';
import Clock from 'src/components/assets/icons/clock';
import {TertiaryButton} from 'src/components/assets/buttons';
import {PAST_TIME_SPEC, FUTURE_TIME_SPEC} from 'src/components/time_spec';

import StatusUpdateCard from './update_card';
import {RHSContent} from './rhs';

enum dueType {
    Scheduled = 'scheduled',
    Overdue = 'overdue',
    Past = 'past',
    Finished = 'finished',
}

// getDueInfo does all the computation to know the relative date and text
// that should be done related to the last/next status update
const getDueInfo = (playbookRun: PlaybookRun, now: DateTime) => {
    const isFinished = playbookRun.current_status === PlaybookRunStatus.Finished;
    const isNextUpdateScheduled = playbookRun.previous_reminder !== 0;
    const timestamp = getTimestamp(playbookRun, isNextUpdateScheduled);
    const isDue = isNextUpdateScheduled && timestamp < now;

    let type: dueType;
    let text: React.ReactNode;

    if (isFinished) {
        text = <FormattedMessage defaultMessage='Run finished'/>;
        type = dueType.Finished;
    } else if (isNextUpdateScheduled) {
        type = (isDue ? dueType.Overdue : dueType.Scheduled);
        text = (isDue ? <FormattedMessage defaultMessage='Update overdue'/> : <FormattedMessage defaultMessage='Update due'/>);
    } else {
        type = dueType.Past;
        text = <FormattedMessage defaultMessage='Last update'/>;
    }

    const timespec = (isDue || !isNextUpdateScheduled) ? PAST_TIME_SPEC : FUTURE_TIME_SPEC;
    const time = (
        <Timestamp
            value={timestamp.toJSDate()}
            units={timespec}
            useTime={false}
        />
    );
    return {time, text, type};
};

interface ViewerProps {
    playbookRun: PlaybookRun;
    lastStatusUpdate?: StatusPostComplete;
    openRHS: (section: RHSContent, title: React.ReactNode, subtitle?: React.ReactNode) => void;
}

export const ViewerStatusUpdate = ({playbookRun, openRHS, lastStatusUpdate}: ViewerProps) => {
    const {formatMessage} = useIntl();
    const fiveSeconds = 5000;
    const now = useNow(fiveSeconds);

    if (!playbookRun.status_update_enabled) {
        return null;
    }

    const dueInfo = getDueInfo(playbookRun, now);

    const renderStatusUpdate = () => {
        if (playbookRun.status_posts.length === 0 || !lastStatusUpdate) {
            return null;
        }
        return <StatusUpdateCard post={lastStatusUpdate}/>;
    };

    return (
        <Container>
            <Header>
                <AnchorLinkTitle
                    title={formatMessage({defaultMessage: 'Recent status update'})}
                    id='recent-update'
                />
                <RightWrapper>
                    <IconWrapper>
                        <IconClock
                            type={dueInfo.type}
                            size={14}
                        />
                    </IconWrapper>
                    <TextDateViewer type={dueInfo.type}>{dueInfo.text}</TextDateViewer>
                    <DueDateViewer type={dueInfo.type}>{dueInfo.time}</DueDateViewer>
                    <ActionButton onClick={() => null}>
                        {formatMessage({defaultMessage: 'Request update...'})}
                    </ActionButton>
                </RightWrapper>
            </Header>
            <Content isShort={false}>
                {renderStatusUpdate() || <Placeholder>{formatMessage({defaultMessage: 'No updates have been posted yet'})}</Placeholder>}
            </Content>
            {playbookRun.status_posts.length ? <ViewAllUpdates onClick={() => openRHS(RHSContent.RunStatusUpdates, formatMessage({defaultMessage: 'Status updates'}), playbookRun.name)}>
                {formatMessage({defaultMessage: 'View all updates'})}
            </ViewAllUpdates> : null}
        </Container>
    );
};

interface ParticipantProps {
    playbookRun: PlaybookRun;
    openRHS: (section: RHSContent, title: React.ReactNode, subtitle?: React.ReactNode) => void;
}

export const ParticipantStatusUpdate = ({playbookRun, openRHS}: ParticipantProps) => {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();
    const fiveSeconds = 5000;
    const now = useNow(fiveSeconds);

    if (!playbookRun.status_update_enabled) {
        return null;
    }

    const dueInfo = getDueInfo(playbookRun, now);

    const postUpdate = () => dispatch(promptUpdateStatus(
        playbookRun.team_id,
        playbookRun.id,
        playbookRun.channel_id,
    ));

    return (
        <Container>
            <Content isShort={true}>
                <IconWrapper>
                    <IconClock
                        type={dueInfo.type}
                        size={24}
                    />
                </IconWrapper>
                <TextDate type={dueInfo.type}>{dueInfo.text}</TextDate>
                <DueDateParticipant type={dueInfo.type}>{dueInfo.time}</DueDateParticipant>
                <RightWrapper>
                    <ActionButton onClick={postUpdate}>
                        {formatMessage({defaultMessage: 'Post update'})}
                    </ActionButton>
                    <Kebab>
                        <DotMenu icon={<ThreeDotsIcon/>}>
                            <DropdownMenuItemStyled onClick={() => openRHS(RHSContent.RunStatusUpdates, formatMessage({defaultMessage: 'Status updates'}), playbookRun.name)}>
                                <FormattedMessage defaultMessage='View all updates'/>
                            </DropdownMenuItemStyled>
                        </DotMenu>
                    </Kebab>
                </RightWrapper>
            </Content>
        </Container>
    );
};

const Container = styled.div`
    margin: 8px 0 16px 0;
    display: flex;
    flex-direction: column;
`;

const Content = styled.div<{isShort: boolean}>`
    display: flex;
    flex-direction: row;
    border: 1px solid rgba(var(--center-channel-color-rgb), 0.08);
    padding: 12px;
    border-radius: 4px;
    height: ${({isShort}) => (isShort ? '56px' : 'auto')};
    align-items: center;
`;

const Header = styled.div`
    margin-top: 16px;
    margin-bottom: 4px;
    display: flex;
    flex: 1;
    align-items: center;
`;

const Placeholder = styled.i`
    color: rgba(var(--center-channel-color-rgb), 0.64);
`;

const IconWrapper = styled.div`
    margin-left: 4px;
    display: flex;
`;

const TextDate = styled.div<{type: dueType}>`
    margin: 0 4px;
    font-size: 14px;
    line-height: 20px;
    color: ${({type}) => (type === dueType.Overdue ? 'var(--dnd-indicator)' : 'rgba(var(--center-channel-color-rgb), 0.72)')};
    display: flex;
`;

const TextDateViewer = styled(TextDate)`
    font-size: 12px;
    line-height: 9.5px;
`;

const DueDateParticipant = styled.div<{type: dueType}>`
    font-size: 14px;
    line-height:20px;
    color: ${({type}) => (type === dueType.Overdue ? 'var(--dnd-indicator)' : 'rgba(var(--center-channel-color-rgb), 0.72)')};
    font-weight: 600;
    display: flex;
    margin-right: 5px;
`;

const IconClock = styled(Clock)<{type: dueType, size: number}>`
    color: ${({type}) => (type === dueType.Overdue ? 'var(--dnd-indicator)' : 'rgba(var(--center-channel-color-rgb), 0.72)')};
    height: ${({size}) => size}px;
    width: ${({size}) => size}px;
`;

const DueDateViewer = styled(DueDateParticipant)`
    font-size: 12px;
    line-height: 9.5px;
    margin-right: 10px;

`;
const Kebab = styled.div`
    margin-left: 8px;
    display: flex;
`;

const RightWrapper = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex: 1;
`;

const ActionButton = styled(TertiaryButton)`
    font-size: 12px;
    height: 32px;
    padding: 0 16px;
`;

const ViewAllUpdates = styled.div`
    margin-top: 9px;
    font-size: 11px;
    cursor: pointer;
    color: var(--button-bg);
`;

const ThreeDotsIcon = styled(HamburgerButton)`
    font-size: 18px;
    margin-left: 4px;
`;

