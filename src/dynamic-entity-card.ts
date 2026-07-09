import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {

  private config: any;
  private _hass: any;
    
  private selectedEntity?: string;
  private pickerOpen = false;
  private searchText = "";
    
  private handleSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    this.requestUpdate();
  }

  private previousPickerOpen = false;
  private loadSelection() {
    this.selectedEntity = localStorage.getItem(
      "dynamic-entity-card:selected"
    ) || undefined;
  }

  static styles = css`
    ha-card {
      padding: 16px;
      /* text-align: center; */
    }
  `;

  setConfig(config: any) {
    this.config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSelection();
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
  }

  getCardSize() {
    return 1;
  }

render() {
  if (!this._hass) {
    return html`Loading...`;
  }

  const breakers = Object.keys(this._hass.states)
    .filter(entity => entity.startsWith("switch.span_"))
    .map(entity => ({
      entity,
      name: this._hass.states[entity].attributes.friendly_name
        .replace(/^Span - (Left|Right) /, "")
        .replace(" Breaker", "")
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredBreakers = breakers.filter(item =>
    item.name.toLowerCase().includes(this.searchText.toLowerCase())
  );

  if (this.pickerOpen) {
    return html`
      <ha-card>
        <h3>Select Circuit</h3>

        <input
            placeholder="Search circuits..."
            .value=${this.searchText}
            @input=${this.handleSearch}
        />

        ${filteredBreakers.map(item => html`
          <div
            @click=${() => {
              this.selectedEntity = item.entity;

              localStorage.setItem(
                "dynamic-entity-card:selected",
              item.entity
              );

              this.pickerOpen = false;
              this.requestUpdate();
            }}
            style="padding: 8px; cursor: pointer;"
          >
            ${item.name}
          </div>
        `)}
      </ha-card>
    `;
  }

  if (this.selectedEntity) {
    const name =
      this._hass.states[this.selectedEntity]?.attributes.friendly_name
        ?.replace(/^Span - (Left|Right) /, "")
         .replace(" Breaker", "")

    return html`
      <ha-card>
        <h3>${name}</h3>
        <button @click=${() => {
          this.pickerOpen = true;
          this.searchText = "";
          this.requestUpdate();
        }}>
          Change Circuit
        </button>
      </ha-card>
    `;
  }

  return html`
    <ha-card>
      <button @click=${() => {
        this.pickerOpen = true;
        this.searchText = "";
        this.requestUpdate();
      }}>
        Select Circuit
      </button>
    </ha-card>
  `;
}
}