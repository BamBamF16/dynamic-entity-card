import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("dynamic-entity-card")
export class DynamicEntityCard extends LitElement {
  static styles = css`
    ha-card {
      padding: 16px;
      text-align: center;
    }
  `;

  render() {
    return html`
      <ha-card>
        Dynamic Entity Card loaded
      </ha-card>
    `;
  }
}