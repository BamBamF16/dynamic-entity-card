import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

// Hardcoded MDI path data for "arrow-left" and "pencil" - avoids adding
// @mdi/js as a dependency just for two icons. If you already have @mdi/js
// installed elsewhere in your project, feel free to import mdiArrowLeft
// and mdiPencil from it instead and drop these two constants.
const mdiArrowLeft =
  "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";
const mdiPencil =
  "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z";

// Single-entity card types only - each of these takes one `entity:` in its
// config, as opposed to cards like `entities` or `glance` which take an
// `entities:` list and can display any number of entities at once. Add to
// this list freely, but only with cards that are single-entity by design.
const CHILD_CARD_TYPES = [
  { value: "tile", label: "Tile" },
  { value: "button", label: "Button" },
  { value: "entity", label: "Entity" },
  { value: "gauge", label: "Gauge" },
  { value: "light", label: "Light" },
  { value: "sensor", label: "Sensor" },
  { value: "thermostat", label: "Thermostat" },
  { value: "media-control", label: "Media Control" },
];

@customElement("dynamic-entity-card-editor")
export class DynamicEntityCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public config?: any;

  // Whether the nested native card editor panel is open
  @state() private _editingChildCard = false;

  // Briefly shown when the user tries to set entity/name in the nested
  // editor - those fields are intentionally kept blank since they're
  // supplied by the parent card at render time.
  @state() private _reservedKeyWarning = false;
  private _reservedKeyWarningTimeout?: number;

  setConfig(config: any) {
    this.config = config || {};
  }

  render() {
    if (!this.config) {
      return nothing;
    }

    // Same pattern as the built-in Entities card: clicking edit swaps the
    // whole editor view out for the sub-editor, with a back caret to return -
    // rather than stacking the sub-editor inline below the main form.
    if (this._editingChildCard) {
      return this._renderChildCardEditor();
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${this._schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div class="child-card-section">
        <span class="child-card-label">Child Card:</span>

        <select
          .value=${this.config.child_card?.type || "tile"}
          @change=${this._childTypeChanged}
        >
          ${CHILD_CARD_TYPES.map(
            (t) => html`<option value=${t.value}>${t.label}</option>`
          )}
        </select>

        <ha-icon-button
          .path=${mdiPencil}
          label="Edit Child Card"
          @click=${this._openChildEditor}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderChildCardEditor() {
    // hui-card-element-editor is an internal HA component - not part of any
    // public API, but it's guaranteed to already be registered by the time
    // this editor is mounted, because hui-dialog-edit-card (the thing that
    // hosts us) imports it before rendering our editor at all.
    const available = customElements.get("hui-card-element-editor");

    return html`
      <div class="sub-editor-header">
        <ha-icon-button
          .path=${mdiArrowLeft}
          label="Back"
          @click=${this._closeChildEditor}
        ></ha-icon-button>
        <span class="sub-editor-title">Edit Child Card (${this._childCardTypeLabel()})</span>
      </div>

      <ha-alert alert-type="info">
        Entity and Name are set automatically from your ${this.config
          .entity_label || "Entity"} selection above and can't be edited
        here.
      </ha-alert>

      ${this._reservedKeyWarning
        ? html`
            <ha-alert alert-type="warning">
              Entity and Name are controlled by the parent card and can't be
              changed from this editor.
            </ha-alert>
          `
        : nothing}

      ${available
        ? html`
            <hui-card-element-editor
              .hass=${this.hass}
              .value=${this._stripReservedKeys(this.config.child_card)}
              .showVisibilityTab=${false}
              @config-changed=${this._childCardConfigChanged}
            ></hui-card-element-editor>
          `
        : html`
            <ha-alert alert-type="warning">
              The native card editor component isn't available in this Home
              Assistant version. Please edit the child_card section via YAML
              mode.
            </ha-alert>
          `}
    `;
  }

  private _schema = [
    { name: "title", selector: { text: {} } },
    {
      name: "title_position",
      selector: {
        select: {
          options: [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
          mode: "radio",
        },
      },
    },
    { name: "entity_label", selector: { text: {} } },
    { name: "name_cleanup_regex", selector: { object: {} } },
    {
      type: "expandable",
      name: "picker",
      title: "Entity Picker",
      schema: [
        { name: "domain", selector: { text: {} } },
        { name: "include_regex", selector: { object: {} } },
        { name: "exclude_regex", selector: { object: {} } },
        { name: "show_entity_id", selector: { boolean: {} } },
      ],
    },
  ];

  private _computeLabel = (schema: any) => {
    switch (schema.name) {
      case "name_cleanup_regex": return "Name Cleanup Regex";
      case "include_regex": return "Include Regex";
      case "exclude_regex": return "Exclude Regex";
      case "entity_label": return "Entity Label";
      case "show_entity_id": return "Show Entity ID";
      case "title_position": return "Title Position";
      default: return schema.name;
    }
  };

  private _computeHelper = (schema: any) => {
    switch (schema.name) {
      case "entity_label": return "Label for entities used throughout card.";
      case "name_cleanup_regex": return "Applied in order to clean up displayed entity names.";
      case "include_regex": return "Only entities matching these regex patterns are listed in the picker list.";
      case "exclude_regex": return "Entities matching these regex patterns are removed from the picker list.";
      default: return undefined;
    }
  };

  private _valueChanged(ev: CustomEvent) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { ...this.config, ...ev.detail.value } }
    }));
  }

  private _childCardTypeLabel(): string {
    const type = this.config.child_card?.type || "tile";
    const match = CHILD_CARD_TYPES.find((t) => t.value === type);
    return match ? match.label : type;
  }

  private _openChildEditor() {
    this._editingChildCard = true;
  }

  private _closeChildEditor() {
    this._editingChildCard = false;
    this._reservedKeyWarning = false;
    if (this._reservedKeyWarningTimeout) {
      window.clearTimeout(this._reservedKeyWarningTimeout);
    }
  }

  // entity and name are owned by the parent card (they come from whichever
  // item the user picked in the entity picker) - never let the child card's
  // own editor persist values for these, no matter what the user types
  // into the native tile/button/entity editor's entity or name fields.
  private _stripReservedKeys(childCardConfig: any) {
    const { entity, name, ...rest } = childCardConfig || {};
    return rest;
  }

  private _flashReservedKeyWarning() {
    this._reservedKeyWarning = true;

    if (this._reservedKeyWarningTimeout) {
      window.clearTimeout(this._reservedKeyWarningTimeout);
    }

    this._reservedKeyWarningTimeout = window.setTimeout(() => {
      this._reservedKeyWarning = false;
      this._reservedKeyWarningTimeout = undefined;
    }, 3000);
  }

  private _childTypeChanged(ev: Event) {
    const type = (ev.target as HTMLSelectElement).value;

    // Reset to a minimal config for the new type - keeps stale
    // type-specific keys from a previous card type out of the config.
    const newChildCard = { type };

    this.config = {
      ...this.config,
      child_card: newChildCard,
    };

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this.config }
    }));
  }

  // hui-card-element-editor's config-changed event carries { config, error,
  // guiModeAvailable } - NOT { value } like ha-form does. Different
  // component, different event shape.
  private _childCardConfigChanged(ev: CustomEvent) {
    ev.stopPropagation();

    // Since we always feed the nested editor a value with no entity/name,
    // any non-empty entity or name on the way back out means the user just
    // interacted with one of those fields - flash the warning.
    if (ev.detail.config?.entity || ev.detail.config?.name) {
      this._flashReservedKeyWarning();
    }

    this.config = {
      ...this.config,
      child_card: this._stripReservedKeys(ev.detail.config),
    };

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this.config }
    }));
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .child-card-section {
        margin-top: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .child-card-label {
        font-weight: 500;
      }

      .child-card-section select {
        flex: 1;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      .sub-editor-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .sub-editor-title {
        font-size: 1.1rem;
        font-weight: 500;
      }
    `;
  }
}