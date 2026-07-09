import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {
  private config: any;
  private _hass: any;

  static styles = css`
    ha-card {
      padding: 16px;
      text-align: center;
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
      .filter(entity => entity.startsWith("switch.span_"));

    return html`
      <ha-card>
        Dynamic Entity Card loaded
        <br>
        Found ${breakers.length} Span breakers
      </ha-card>
    `;
  }
}