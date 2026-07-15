import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("dynamic-entity-card-editor")
export class DynamicEntityCardEditor extends LitElement {
  
  @property({ attribute: false })
  public hass: any;

  @property({ attribute: false })
  public config: any;

  setConfig(config: any) {
    this.config = config;
  }
  
  render() {
    return html`
      <input
        placeholder="Title"
        .value=${this.config?.title || ""}
        @input=${this._titleChanged}
      />

      <input
        placeholder="Entity Label"
        .value=${this.config?.entity_label || "Entity"}
        @input=${this._entityLabelChanged}
      />
    `;
  }

  private _titleChanged(ev: Event) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          value: {
            ...this.config,
            title: (ev.target as HTMLInputElement).value,
          },
        },
      })
    );
  }

  private _entityLabelChanged(ev: Event) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          value: {
            ...this.config,
            entity_label: (ev.target as HTMLInputElement).value,
          },
        },
      })
    );
  }
}