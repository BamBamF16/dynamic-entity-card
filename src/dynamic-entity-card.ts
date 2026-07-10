import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { LovelaceCard } from "custom-card-helpers";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {

  private config: any;
  private _hass: any;
  private cardElement?: HTMLElement;

  private selectedEntity?: string;
  private selectedName = "";
  private pickerOpen = false;
  private searchText = "";
  
  private tileCard?: LovelaceCard;  
    
  private handleSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    this.requestUpdate();
  }

  private cleanEntityName(name: string): string {
    let cleaned = name;
    let lastGood = name;

    const applyPatterns = (patterns: string[] | undefined) => {
      if (!patterns) return;

      for (const pattern of patterns) {
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
    };

    applyPatterns(this.config.name_prefix_regex);
    applyPatterns(this.config.name_suffix_regex);

    return lastGood;
  }

  private previousPickerOpen = false;
    
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

  static styles = css`
    ha-card.wrapper {
      padding: 0px;
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
  `;

  setConfig(config: any) {
    this.config = {
      title: "",
      title_position: "left",
      storage_key: undefined,
      entity_label: "Entity",
      show_entity_id: false,
      entity_domain: undefined,
      entity_prefix: undefined,
      name_prefix_regex: [],
      name_suffix_regex: [],
      vertical: false,
      show_icon: true,
      show_state: true,
      features_position: "bottom",
      show_toggle: true,
      ...config,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSelection();
  }

  protected async firstUpdated() {
    await this.createTileCard();
  }
    
  private async createTileCard() {
    const helpers = await (window as any).loadCardHelpers();

    this.tileCard = await helpers.createCardElement({
    type: "tile",
    entity: this.selectedEntity!,
    name: this.selectedName,
    vertical: this.config.vertical,
    icon: this.config.show_icon ? undefined : "",
    hide_state: !this.config.show_state,
    features_position: this.config.features_position,
    features: this.config.show_toggle
      ? [
          {
            type: "toggle",
          },
        ]
      : [],
    });

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

   set hass(hass: any) {
    this._hass = hass;

    if (this.tileCard) {
      this.tileCard.hass = hass;
    }
  }
  

  getCardSize() {
    return 1;
  }

  render() {
    if (!this._hass) {
      return html`Loading...`;
    }

  const breakers = Object.keys(this._hass.states)
    .filter(entity => {
      const domain = entity.split(".")[0];

      if (this.config.entity_domain &&
          domain !== this.config.entity_domain) {
        return false;
      }

      if (this.config.entity_prefix &&
          !entity.startsWith(this.config.entity_prefix)) {
        return false;
      }

      return true;
    })
    .map(entity => ({
      entity,
      name: this.cleanEntityName(
        this._hass.states[entity].attributes.friendly_name
      )
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredBreakers = breakers.filter(item =>
    item.name.toLowerCase().includes(this.searchText.toLowerCase())
  );

  if (this.pickerOpen) {
    return html`
      <ha-card class="wrapper"
        id="dynamic-card"
        style="--dynamic-title-align: ${this.config.title_position};"
      >
        ${this.config.title ? html`
          <h3 class="card-title">${this.config.title}</h3>
        ` : ""}

        <h3 class="picker-title">
          Select ${this.config.entity_label}
        </h3>

        <input
          class="search-input"
          placeholder="Search ${this.config.entity_label.toLowerCase()}s..."
          .value=${this.searchText}
          @input=${this.handleSearch}
        />

        ${filteredBreakers.map(item => html`
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

              setTimeout(() => {
                this.shadowRoot
                  ?.querySelector("#dynamic-card")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
              }, 100);
            }}
          >
            <div class="entity-name">
              ${item.name}
            </div>

            ${this.config.show_entity_id ? html`
              <div class="entity-id">
                - ${item.entity}
              </div>
            ` : ""}
          </div>
        `)}
      </ha-card>
    `;
  }

  if (this.selectedEntity) {
    const stateObj = this._hass.states[this.selectedEntity];

    const name =
      this._hass.states[this.selectedEntity]?.attributes.friendly_name;

    this.selectedName = name
      ? this.cleanEntityName(name)
      : "";
    
  return html`
    <ha-card 
      class="wrapper"
      id="dynamic-card"
      style="--dynamic-title-align: ${this.config.title_position};"
    >
    ${this.config.title ? html`
          <h3 class="card-title">${this.config.title}</h3>
        ` : ""}
        ${this.tileCard}
        <button class="change-button" @click=${() => {
        this.pickerOpen = true;
        this.searchText = "";
        this.requestUpdate();
        }}>
        Change ${this.config.entity_label}
        </button>
    </ha-card>
    `;
  }

  return html`
    <ha-card 
      class="wrapper"
      id="dynamic-card"
      style="--dynamic-title-align: ${this.config.title_position};"
    >
      ${this.config.title ? html`
        <h3 class="card-title">${this.config.title}</h3>
      ` : ""}
      <button class="change-button" @click=${() => {
        this.pickerOpen = true;
        this.searchText = "";
        this.requestUpdate();
      }}>
        Select ${this.config.entity_label}
      </button>
    </ha-card>
  `;
  }
}