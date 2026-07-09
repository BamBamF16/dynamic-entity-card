import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {

  private config: any;
  private _hass: any;
    
  private selectedEntity?: string;
  private pickerOpen = false;
  private searchText = "";
    
  static styles = css`
    ha-card {
      padding: 16px;
      /* text-align: center; */
    }
  `;

  setConfig(config: any) {
    this.config = config;
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

  if (this.pickerOpen) {
    return html`
      <ha-card>
        <h3>Select Circuit</h3>

        ${breakers.map(item => html`
          <div
            @click=${() => {
              this.selectedEntity = item.entity;
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
        this.requestUpdate();
      }}>
        Select Circuit
      </button>
    </ha-card>
  `;
}
}