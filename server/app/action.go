package app

import (
	"database/sql/driver"
	"fmt"

	"github.com/mattermost/mattermost-server/v6/model"
)

type GenericChannelActionWithoutPayload struct {
	ID          string      `json:"id"`
	ChannelID   string      `json:"channel_id"`
	Enabled     bool        `json:"enabled"`
	DeleteAt    int64       `json:"delete_at"`
	ActionType  ActionType  `json:"action_type"`
	TriggerType TriggerType `json:"trigger_type"`
}

type GenericChannelAction struct {
	GenericChannelActionWithoutPayload
	Payload interface{} `json:"payload"`
}

type WelcomeMessagePayload struct {
	Message string `json:"message" mapstructure:"message"`
}

type PromptRunPlaybookFromKeywordsPayload struct {
	Keywords   []string `json:"keywords" mapstructure:"keywords"`
	PlaybookID string   `json:"playbook_id" mapstructure:"playbook_id"`
}

type CategorizeChannelPayload struct {
	CategoryName string `json:"category_name" mapstructure:"category_name"`
}

type TriggerType string

// ActionType
type ActionType int

// values ActionType can take
const (
	ActionTypeUnknown ActionType = iota
	ActionTypeWelcomeMessage
	ActionTypePromptRunPlaybook
	ActionTypeCategorizeChannel
)

var ActionTypes = [...]string{
	ActionTypeUnknown:           "",
	ActionTypeWelcomeMessage:    "send_welcome_message",
	ActionTypePromptRunPlaybook: "prompt_run_playbook",
	ActionTypeCategorizeChannel: "categorize_channel",
}

// String creates the string version of the ActionType
func (a ActionType) String() string {
	return ActionTypes[a]
}

// MarshalText renders the ActionType as text
func (a ActionType) MarshalText() (text []byte, err error) {
	return []byte(a.String()), nil
}

// UnmarshalText parses a ActionType from a textual representation
func (a *ActionType) UnmarshalText(text []byte) error {
	for i, ct := range ActionTypes {
		if ct == string(text) {
			*a = ActionType(i)
			return nil
		}
	}
	return fmt.Errorf("unknown action type: %s", string(text))
}

// Scan parses a action type back from the DB
func (a *ActionType) Scan(src interface{}) error {
	txt, ok := src.([]byte)
	if ok {
		return a.UnmarshalText(txt)
	}
	txtStr, ok := src.(string)
	if ok {
		return a.UnmarshalText([]byte(txtStr))
	}

	return fmt.Errorf("could not cast action type to []byte: %v %T", src, src)
}

// Value represents a ActionType as a type writable into the DB
func (a ActionType) Value() (driver.Value, error) {
	return a.MarshalText()
}

const (
	// Trigger types: add new types to the ValidTriggerTypes array below
	TriggerTypeNewMemberJoins TriggerType = "new_member_joins"
	TriggerTypeKeywordsPosted TriggerType = "keywords"
)

var ValidTriggerTypes = []TriggerType{
	TriggerTypeNewMemberJoins,
	TriggerTypeKeywordsPosted,
}

type GetChannelActionOptions struct {
	ActionType  ActionType
	TriggerType TriggerType
}

type ChannelActionService interface {
	// Create creates a new action
	Create(action GenericChannelAction) (string, error)

	// Get returns the action identified by id
	Get(id string) (GenericChannelAction, error)

	// GetChannelActions returns all actions in channelID,
	// filtered with the options if different from its zero value
	GetChannelActions(channelID string, options GetChannelActionOptions) ([]GenericChannelAction, error)

	// Validate checks that the action type, trigger type and
	// payload are all valid and consistent with each other
	Validate(action GenericChannelAction) error

	// Update updates an existing action identified by action.ID
	Update(action GenericChannelAction) error

	// UserHasJoinedChannel is called when userID has joined channelID. If actorID is not blank, userID
	// was invited by actorID.
	UserHasJoinedChannel(userID, channelID, actorID string)

	// CheckAndSendMessageOnJoin checks if userID has viewed channelID and sends
	// the registered welcome message action. Returns true if the message was sent.
	CheckAndSendMessageOnJoin(userID, channelID string) bool

	// MessageHasBeenPosted suggests playbooks to the user if triggered
	MessageHasBeenPosted(sessionID string, post *model.Post)
}

type ChannelActionStore interface {
	// Create creates a new action
	Create(action GenericChannelAction) (string, error)

	// Get returns the action identified by id
	Get(id string) (GenericChannelAction, error)

	// GetChannelActions returns all actions in channelID,
	// filtered with the options if different from its zero value
	GetChannelActions(channelID string, options GetChannelActionOptions) ([]GenericChannelAction, error)

	// Update updates an existing action identified by action.ID
	Update(action GenericChannelAction) error

	// HasViewedChannel returns true if userID has viewed channelID
	HasViewedChannel(userID, channelID string) bool

	// SetViewedChannel records that userID has viewed channelID. NOTE: does not check if there is already a
	// record of that userID/channelID (i.e., will create duplicate rows)
	SetViewedChannel(userID, channelID string) error

	// SetViewedChannel records that all users in userIDs have viewed channelID.
	SetMultipleViewedChannel(userIDs []string, channelID string) error
}

// ChannelActionTelemetry defines the methods that the ChannelAction service needs from RudderTelemetry.
// userID is the user initiating the event.
type ChannelActionTelemetry interface {
	// RunChannelAction tracks the execution of a channel action
	RunChannelAction(action GenericChannelAction, userID string)
}
