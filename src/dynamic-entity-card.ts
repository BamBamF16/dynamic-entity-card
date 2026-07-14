import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { LovelaceCard } from "custom-card-helpers";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {
  private config: any;
  private _hass: any;

  private selectedEntity?: string;
  private selectedName = "";
  private pickerOpen = false;
  private previousPickerOpen = false;
  private searchText = "";

  private tileCard?: LovelaceCard;

  static styles = css`
    
    :host {
      position: relative;
      display: block;
    }

    .card-container {
      position: relative;
    }

    ha-card.wrapper {
      padding: 0px;
      position: relative;
      overflow: visible;
    }

    .card-title {
      margin: 8px 8px 8px 8px;
      text-align: var(--dynamic-title-align, left);
    }

    .change-button {
      display: block;
      margin: 8px auto 4px auto;
      padding: 8px 24px;
      min-width: 140px;
      font-weight: bold;
    }

    .picker-title {
      margin: 8px 8px 0 8px;
      text-align: var(--dynamic-title-align, left);
    }

    .search-input {
      display: block;
      width: calc(100% - 16px);
      margin: 8px auto;
      padding: 8px;
      box-sizing: border-box;
    }

    .entity-row {
      padding: 12px 8px;
      cursor: pointer;
      border-top: 1px solid var(--divider-color);
    }

    .entity-row:hover {
      background: var(--secondary-background-color);
    }

    .entity-name {
      font-size: 1rem;
    }

    .entity-id {
      margin-left: 16px;
      font-size: 0.8rem;
      color: var(--secondary-text-color);
    }

    .overlay {
      position: absolute;
      top: 40px;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.3);
      z-index: 100;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: visible;
    }

    .picker-panel {
      background: var(--card-background-color);
      width: calc(100% - 16px);
      margin-top: 8px;
      border-radius: 12px;
      overflow: auto;
      max-height: 90%;
    }
  
  `;

  setConfig(config: any) {
    this.config = {
      title: "",
      title_position: "left",
      storage_key: undefined,
      entity_label: "Entity",
      name_cleanup_regex: [],
      ...config,

      picker: {
        domain: undefined,
        include_regex: [],
        exclude_regex: [],
        show_entity_id: false,
        ...config.picker,
      },

      child_card: {
        type: "tile",
        vertical: false,
        show_icon: true,
        show_state: true,
        features: [],
        features_position: "bottom",
        ...config.child_card
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSelection();
  }

  protected async firstUpdated() {
    await this.createTileCard();
  }

  set hass(hass: any) {
    this._hass = hass;

    if (this.tileCard) {
      this.tileCard.hass = hass;
    }
  }

  getCardSize() {
    return 1;
  }

  private getStorageKey(): string | undefined {
    if (this.config.storage_key) {
      return `dynamic-entity-card:${this.config.storage_key}`;
    }

    if (this.config.title) {
      const normalized = this.config.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");

      return `dynamic-entity-card:${normalized}`;
    }

    return undefined;
  }

  private loadSelection() {
    const key = this.getStorageKey();

    if (!key) {
      return;
    }

    this.selectedEntity = localStorage.getItem(key) || undefined;

    if (this.selectedEntity) {
      this.createTileCard();
    }
  }

  private cleanEntityName(name: string): string {
    let cleaned = name;
    let lastGood = name;

    for (const pattern of this.config.name_cleanup_regex || []) {
      try {
        const next = cleaned.replace(new RegExp(pattern), "").trim();

        if (next) {
          cleaned = next;
          lastGood = next;
        }
      } catch {
        // Ignore invalid regex patterns
      }
    }

    return lastGood;
  }

  private handleSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    this.requestUpdate();
  }

  private matchesRegex(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      try {
        return new RegExp(pattern).test(value);
      } catch {
        return false;
      }
    });
  }

  private async createTileCard() {
    const helpers = await (window as any).loadCardHelpers();

    const cardConfig = {
      type: this.config.child_card?.type || "tile",
      entity: this.selectedEntity!,
      name: this.selectedName,
      vertical: this.config.child_card.vertical,
      icon: this.config.child_card.show_icon ? undefined : "",
      hide_state: !this.config.child_card.show_state,
      features_position: this.config.child_card.features_position,
      features: this.config.child_card.features || [],
    };

    this.tileCard = await helpers.createCardElement(cardConfig);

    this.tileCard!.hass = this._hass!;
    this.requestUpdate();
  }

  updated() {
    if (this.pickerOpen && !this.previousPickerOpen) {
      const input = this.shadowRoot?.querySelector("input");
      setTimeout(() => input?.focus(), 0);
    }

    this.previousPickerOpen = this.pickerOpen;
  }

  private getEntities() {
    const entities = Object.keys(this._hass.states)
      .filter((entity) => {
        const domain = entity.split(".")[0];

        if (
          this.config.picker.domain &&
          domain !== this.config.picker.domain
        ) {
          return false;
        }

        if (
          this.config.picker.include_regex.length &&
          !this.matchesRegex(entity, this.config.picker.include_regex)
        ) {
          return false;
        }

        if (
          this.matchesRegex(entity, this.config.picker.exclude_regex)
        ) {
          return false;
        }

        return true;
      })
      .map((entity) => ({
        entity,
        name: this.cleanEntityName(
          this._hass.states[entity].attributes.friendly_name
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return entities;
  }

  private getFilteredEntities(entities: any[]) {
    const filteredEntities = entities.filter((item) =>
      item.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
    return filteredEntities;
  }

  render() {
    if (!this._hass) {
      return html`Loading...`;
    }

    const entities = this.getEntities();
    const filteredEntities = this.getFilteredEntities(entities);

    if (this.selectedEntity) {
      const stateObj = this._hass.states[this.selectedEntity];
      const name = this._hass.states[this.selectedEntity]?.attributes.friendly_name;

      this.selectedName = name
        ? this.cleanEntityName(name)
        : "";

    return html`
      <div class="card-container">
          <ha-card
            class="wrapper"
            id="dynamic-card"
            style="--dynamic-title-align: ${this.config.title_position};"
          >
          
            ${this.config.title? html`<h3 class="card-title">${this.config.title}</h3>`: ""}

            ${this.tileCard}

            <button
              class="change-button"
              @click=${() => {
                this.pickerOpen = true;
                this.searchText = "";
                this.requestUpdate();
              }}
            >
              Change ${this.config.entity_label}
            </button>

          </ha-card>

          ${this.pickerOpen ? this.renderPickerOverlay(entities) : ""}

        </div>
      `;
    }

    return html`
      <ha-card
        class="wrapper"
        id="dynamic-card"
        style="--dynamic-title-align: ${this.config.title_position};"
      >
        ${this.config.title
          ? html`
              <h3 class="card-title">${this.config.title}</h3>
            `
          : ""}

        <button
          class="change-button"
          @click=${() => {
            this.pickerOpen = true;
            this.searchText = "";
            this.requestUpdate();
          }}
        >
          Select ${this.config.entity_label}
        </button>
      </ha-card>
    `;
  }

  private renderPicker(entities: any[]) {
    const filteredEntities = this.getFilteredEntities(entities);

    return html`
      <h3 class="picker-title">
        Select ${this.config.entity_label}
      </h3>

      <input
        class="search-input"
        placeholder="Search ${this.config.entity_label.toLowerCase()}s..."
        .value=${this.searchText}
        @input=${this.handleSearch}
      />

      ${filteredEntities.map(
        (item) => html`
          <div
            class="entity-row"
            @click=${() => {
              this.selectedEntity = item.entity;
              this.createTileCard();

              const key = this.getStorageKey();

              if (key) {
                localStorage.setItem(key, item.entity);
              }

              this.pickerOpen = false;
              this.requestUpdate();
            }}
          >
            <div class="entity-name">
              ${item.name}
            </div>

            ${this.config.picker.show_entity_id
              ? html`
                  <div class="entity-id">
                    - ${item.entity}
                  </div>
                `
              : ""}
          </div>
        `
      )}
    `;
  }

  private renderPickerOverlay(entities: any[]) {
    return html`
      <div class="overlay" @click=${() => {
        this.pickerOpen = false;
      }}>
        <div class="picker-panel" @click=${(e: Event) => e.stopPropagation()}>
          ${this.renderPicker(entities)}
        </div>
      </div>
    `;
  }
  
}