/**
 * Water Softener Card for Home Assistant
 * Displays Clack WS1 TT duplex water softener status
 */

class WaterSoftenerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
  }

  static getConfigElement() {
    return document.createElement('water-softener-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Water Softener',
      tank_in_service: '',
      tank_a_capacity: '',
      tank_b_capacity: '',
      salt_level: '',
      regeneration_active: '',
      regen_stage: '',
      regen_time_remaining: '',
      low_salt_warning: 20,
      low_capacity_warning: 10
    };
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getEntityState(entityId) {
    if (!this._hass || !entityId) return null;
    const state = this._hass.states[entityId];
    return state ? state.state : null;
  }

  getEntityNumeric(entityId) {
    const state = this.getEntityState(entityId);
    if (state === null || state === 'unknown' || state === 'unavailable') return null;
    const num = parseFloat(state);
    return isNaN(num) ? null : num;
  }

  formatNumber(value, decimals = 0) {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  formatRelativeTime(dateStr) {
    if (!dateStr || dateStr === 'unknown' || dateStr === 'unavailable') return 'Unknown';

    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  isRegenerating() {
    const regenState = this.getEntityState(this._config.regeneration_active);
    return regenState === 'on' || regenState === 'true' || regenState === true;
  }

  getActiveRegenTank() {
    if (!this.isRegenerating()) return null;
    const inService = this.getEntityState(this._config.tank_in_service);
    // The tank NOT in service is the one regenerating
    if (inService === 'Tank A') return 'B';
    if (inService === 'Tank B') return 'A';
    return null;
  }

  render() {
    if (!this._hass || !this._config) return;

    const config = this._config;
    const isRegen = this.isRegenerating();
    const regenTank = this.getActiveRegenTank();
    const inService = this.getEntityState(config.tank_in_service) || 'Tank A';

    // Tank capacities
    const tankACapacity = this.getEntityNumeric(config.tank_a_capacity);
    const tankBCapacity = this.getEntityNumeric(config.tank_b_capacity);
    const tankAPercent = this.getEntityNumeric(config.tank_a_capacity_percent);
    const tankBPercent = this.getEntityNumeric(config.tank_b_capacity_percent);

    // Salt level
    const saltLevel = this.getEntityNumeric(config.salt_level) || 0;
    const brineLevelLive = this.getEntityNumeric(config.brine_level_live);
    const lowSaltWarning = config.low_salt_warning || 20;
    const lowCapacityWarning = config.low_capacity_warning || 10;

    // Regeneration info
    const regenStage = this.getEntityState(config.regen_stage) || 'Idle';
    const regenTimeRemaining = this.getEntityNumeric(config.regen_time_remaining);

    // Flow and usage
    const flowRate = this.getEntityNumeric(config.flow_rate);
    const dailyUsage = this.getEntityNumeric(config.daily_usage);
    const totalUsage = this.getEntityNumeric(config.total_usage);

    // Last regen times
    const tankALastRegen = this.getEntityState(config.tank_a_last_regen);
    const tankBLastRegen = this.getEntityState(config.tank_b_last_regen);

    // Determine tank states
    const tankAActive = inService === 'Tank A' && !isRegen || (isRegen && regenTank === 'B');
    const tankBActive = inService === 'Tank B' && !isRegen || (isRegen && regenTank === 'A');
    const tankARegenning = isRegen && regenTank === 'A';
    const tankBRegenning = isRegen && regenTank === 'B';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --tank-active-color: #2196F3;
          --tank-standby-color: #9E9E9E;
          --tank-regen-color: #FF9800;
          --tank-warning-color: #F44336;
          --salt-color: #F5F5DC;
          --water-color: rgba(33, 150, 243, 0.5);
          --tank-bg: #E0E0E0;
        }

        ha-card {
          padding: 16px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .title {
          font-size: 1.2em;
          font-weight: 500;
        }

        .regen-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.85em;
          font-weight: 500;
        }

        .regen-status.active {
          background: var(--tank-regen-color);
          color: white;
          animation: pulse 2s infinite;
        }

        .regen-status.idle {
          background: #4CAF50;
          color: white;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .tanks-container {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 16px;
        }

        .tank-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .tank-wrapper.brine {
          flex: 1.3;
        }

        .tank {
          width: 100%;
          max-width: 80px;
          height: 120px;
          border: 3px solid #666;
          border-radius: 8px;
          background: var(--tank-bg);
          position: relative;
          overflow: hidden;
        }

        .tank.brine-tank {
          max-width: 100px;
          height: 100px;
        }

        .tank-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          transition: height 0.5s ease, background-color 0.3s ease;
        }

        .tank-fill.active {
          background: var(--tank-active-color);
        }

        .tank-fill.standby {
          background: var(--tank-standby-color);
        }

        .tank-fill.regenerating {
          background: var(--tank-regen-color);
          animation: pulse 2s infinite;
        }

        .tank-fill.salt {
          background: var(--salt-color);
          border-top: 2px solid #D4C896;
        }

        .tank-fill.water-overlay {
          background: var(--water-color);
          z-index: 1;
        }

        .tank-fill.low-warning {
          background: var(--tank-warning-color);
        }

        .tank-label {
          font-weight: 600;
          margin-top: 8px;
          font-size: 0.9em;
        }

        .tank-status {
          font-size: 0.75em;
          padding: 2px 8px;
          border-radius: 10px;
          margin-top: 4px;
          font-weight: 500;
        }

        .tank-status.in-service {
          background: var(--tank-active-color);
          color: white;
        }

        .tank-status.standby {
          background: var(--tank-standby-color);
          color: white;
        }

        .tank-status.regenerating {
          background: var(--tank-regen-color);
          color: white;
        }

        .tank-capacity {
          font-size: 0.8em;
          color: var(--secondary-text-color);
          margin-top: 4px;
          text-align: center;
        }

        .tank-regen-info {
          font-size: 0.75em;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }

        .regen-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 2;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          font-size: 0.7em;
          font-weight: 600;
          width: 90%;
        }

        .regen-overlay .stage {
          font-size: 1.1em;
        }

        .regen-overlay .time {
          font-size: 0.9em;
          opacity: 0.9;
        }

        .brine-stage-overlay {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.65em;
          color: #333;
          background: rgba(255,255,255,0.8);
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 3;
          white-space: nowrap;
        }

        .stats-bar {
          display: flex;
          justify-content: space-around;
          padding: 12px;
          background: var(--card-background-color, #f5f5f5);
          border-radius: 8px;
          margin-top: 8px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          font-size: 1.1em;
          font-weight: 600;
        }

        .stat-label {
          font-size: 0.75em;
          color: var(--secondary-text-color);
          text-transform: uppercase;
        }

        .warning-icon {
          position: absolute;
          top: 5px;
          right: 5px;
          font-size: 1.2em;
          z-index: 3;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title">${config.title || 'Water Softener'}</div>
          <div class="regen-status ${isRegen ? 'active' : 'idle'}">
            ${isRegen ? `${regenStage}${regenTimeRemaining ? ` - ${regenTimeRemaining}m` : ''}` : 'Normal'}
          </div>
        </div>

        <div class="tanks-container">
          <!-- Tank A -->
          <div class="tank-wrapper">
            <div class="tank">
              <div class="tank-fill ${tankARegenning ? 'regenerating' : (tankAActive ? 'active' : 'standby')} ${tankAPercent !== null && tankAPercent < lowCapacityWarning && tankAActive ? 'low-warning' : ''}"
                   style="height: ${tankAPercent !== null ? tankAPercent : 50}%">
              </div>
              ${tankARegenning ? `
                <div class="regen-overlay">
                  <div class="stage">${regenStage}</div>
                  ${regenTimeRemaining ? `<div class="time">${regenTimeRemaining}m left</div>` : ''}
                </div>
              ` : ''}
              ${tankAPercent !== null && tankAPercent < lowCapacityWarning && tankAActive ? '<div class="warning-icon">&#9888;</div>' : ''}
            </div>
            <div class="tank-label">Tank A</div>
            <div class="tank-status ${tankARegenning ? 'regenerating' : (tankAActive ? 'in-service' : 'standby')}">
              ${tankARegenning ? 'REGENERATING' : (tankAActive ? 'IN SERVICE' : 'STANDBY')}
            </div>
            <div class="tank-capacity">
              ${tankACapacity !== null ? `${this.formatNumber(tankACapacity)} L` : ''}
              ${tankAPercent !== null ? ` (${this.formatNumber(tankAPercent)}%)` : ''}
            </div>
            <div class="tank-regen-info">
              ${tankALastRegen ? `Regen: ${this.formatRelativeTime(tankALastRegen)}` : ''}
            </div>
          </div>

          <!-- Tank B -->
          <div class="tank-wrapper">
            <div class="tank">
              <div class="tank-fill ${tankBRegenning ? 'regenerating' : (tankBActive ? 'active' : 'standby')} ${tankBPercent !== null && tankBPercent < lowCapacityWarning && tankBActive ? 'low-warning' : ''}"
                   style="height: ${tankBPercent !== null ? tankBPercent : 50}%">
              </div>
              ${tankBRegenning ? `
                <div class="regen-overlay">
                  <div class="stage">${regenStage}</div>
                  ${regenTimeRemaining ? `<div class="time">${regenTimeRemaining}m left</div>` : ''}
                </div>
              ` : ''}
              ${tankBPercent !== null && tankBPercent < lowCapacityWarning && tankBActive ? '<div class="warning-icon">&#9888;</div>' : ''}
            </div>
            <div class="tank-label">Tank B</div>
            <div class="tank-status ${tankBRegenning ? 'regenerating' : (tankBActive ? 'in-service' : 'standby')}">
              ${tankBRegenning ? 'REGENERATING' : (tankBActive ? 'IN SERVICE' : 'STANDBY')}
            </div>
            <div class="tank-capacity">
              ${tankBCapacity !== null ? `${this.formatNumber(tankBCapacity)} L` : ''}
              ${tankBPercent !== null ? ` (${this.formatNumber(tankBPercent)}%)` : ''}
            </div>
            <div class="tank-regen-info">
              ${tankBLastRegen ? `Regen: ${this.formatRelativeTime(tankBLastRegen)}` : ''}
            </div>
          </div>

          <!-- Brine Tank -->
          <div class="tank-wrapper brine">
            <div class="tank brine-tank">
              <!-- Salt layer (bottom) -->
              <div class="tank-fill salt ${saltLevel < lowSaltWarning ? 'low-warning' : ''}"
                   style="height: ${saltLevel}%">
              </div>
              <!-- Water overlay during regen -->
              ${isRegen && brineLevelLive !== null ? `
                <div class="tank-fill water-overlay"
                     style="height: ${brineLevelLive}%">
                </div>
                <div class="brine-stage-overlay">${this.getBrineStageText(regenStage)}</div>
              ` : ''}
              ${saltLevel < lowSaltWarning ? '<div class="warning-icon">&#9888;</div>' : ''}
            </div>
            <div class="tank-label">Brine Tank</div>
            <div class="tank-capacity">
              Salt: ${this.formatNumber(saltLevel)}%
              ${saltLevel < lowSaltWarning ? ' - LOW!' : ''}
            </div>
          </div>
        </div>

        ${(flowRate !== null || dailyUsage !== null || totalUsage !== null) ? `
          <div class="stats-bar">
            ${flowRate !== null ? `
              <div class="stat">
                <div class="stat-value">${this.formatNumber(flowRate, 1)} L/min</div>
                <div class="stat-label">Flow Rate</div>
              </div>
            ` : ''}
            ${dailyUsage !== null ? `
              <div class="stat">
                <div class="stat-value">${this.formatNumber(dailyUsage)} L</div>
                <div class="stat-label">Today</div>
              </div>
            ` : ''}
            ${totalUsage !== null ? `
              <div class="stat">
                <div class="stat-value">${this.formatNumber(totalUsage)} L</div>
                <div class="stat-label">Total</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  getBrineStageText(stage) {
    const stageMap = {
      'Backwash': 'Backwash',
      'Brine Draw': 'Drawing Brine',
      'Fast Rinse': 'Rinsing',
      'Brine Fill': 'Refilling',
      'Completing': 'Completing'
    };
    return stageMap[stage] || stage;
  }

  getCardSize() {
    return 4;
  }
}

// Card Editor
class WaterSoftenerCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = config || {};
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass || !this._config) return;

    this.innerHTML = `
      <style>
        .editor-row {
          margin-bottom: 16px;
        }
        .editor-row label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .editor-row input, .editor-row select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          box-sizing: border-box;
        }
        .section-title {
          font-weight: 600;
          margin: 16px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color);
        }
        .entity-picker {
          width: 100%;
        }
      </style>

      <div class="editor-row">
        <label>Title</label>
        <input type="text" id="title" value="${this._config.title || 'Water Softener'}">
      </div>

      <div class="section-title">Tank Entities (Required)</div>

      <div class="editor-row">
        <label>Tank in Service</label>
        <input type="text" id="tank_in_service" value="${this._config.tank_in_service || ''}" placeholder="text_sensor.water_softener_tank_in_service">
      </div>

      <div class="editor-row">
        <label>Tank A Capacity (Litres)</label>
        <input type="text" id="tank_a_capacity" value="${this._config.tank_a_capacity || ''}" placeholder="sensor.water_softener_tank_a_capacity_remaining">
      </div>

      <div class="editor-row">
        <label>Tank B Capacity (Litres)</label>
        <input type="text" id="tank_b_capacity" value="${this._config.tank_b_capacity || ''}" placeholder="sensor.water_softener_tank_b_capacity_remaining">
      </div>

      <div class="editor-row">
        <label>Tank A Capacity (%)</label>
        <input type="text" id="tank_a_capacity_percent" value="${this._config.tank_a_capacity_percent || ''}" placeholder="sensor.water_softener_tank_a_capacity_percent">
      </div>

      <div class="editor-row">
        <label>Tank B Capacity (%)</label>
        <input type="text" id="tank_b_capacity_percent" value="${this._config.tank_b_capacity_percent || ''}" placeholder="sensor.water_softener_tank_b_capacity_percent">
      </div>

      <div class="editor-row">
        <label>Salt Level</label>
        <input type="text" id="salt_level" value="${this._config.salt_level || ''}" placeholder="sensor.water_softener_salt_level">
      </div>

      <div class="section-title">Regeneration Entities</div>

      <div class="editor-row">
        <label>Regeneration Active</label>
        <input type="text" id="regeneration_active" value="${this._config.regeneration_active || ''}" placeholder="binary_sensor.water_softener_regeneration_active">
      </div>

      <div class="editor-row">
        <label>Regen Stage</label>
        <input type="text" id="regen_stage" value="${this._config.regen_stage || ''}" placeholder="text_sensor.water_softener_regen_stage">
      </div>

      <div class="editor-row">
        <label>Regen Time Remaining</label>
        <input type="text" id="regen_time_remaining" value="${this._config.regen_time_remaining || ''}" placeholder="sensor.water_softener_regen_time_remaining">
      </div>

      <div class="section-title">Optional Entities</div>

      <div class="editor-row">
        <label>Flow Rate</label>
        <input type="text" id="flow_rate" value="${this._config.flow_rate || ''}" placeholder="sensor.water_softener_water_flow_rate">
      </div>

      <div class="editor-row">
        <label>Daily Usage</label>
        <input type="text" id="daily_usage" value="${this._config.daily_usage || ''}" placeholder="sensor.water_softener_daily_water_usage">
      </div>

      <div class="editor-row">
        <label>Total Usage</label>
        <input type="text" id="total_usage" value="${this._config.total_usage || ''}" placeholder="sensor.water_softener_total_water_usage">
      </div>

      <div class="editor-row">
        <label>Tank A Last Regen</label>
        <input type="text" id="tank_a_last_regen" value="${this._config.tank_a_last_regen || ''}" placeholder="text_sensor.water_softener_tank_a_last_regen">
      </div>

      <div class="editor-row">
        <label>Tank B Last Regen</label>
        <input type="text" id="tank_b_last_regen" value="${this._config.tank_b_last_regen || ''}" placeholder="text_sensor.water_softener_tank_b_last_regen">
      </div>

      <div class="editor-row">
        <label>Brine Level Live</label>
        <input type="text" id="brine_level_live" value="${this._config.brine_level_live || ''}" placeholder="sensor.water_softener_brine_tank_level_live">
      </div>

      <div class="section-title">Thresholds</div>

      <div class="editor-row">
        <label>Low Salt Warning (%)</label>
        <input type="number" id="low_salt_warning" value="${this._config.low_salt_warning || 20}" min="0" max="100">
      </div>

      <div class="editor-row">
        <label>Low Capacity Warning (%)</label>
        <input type="number" id="low_capacity_warning" value="${this._config.low_capacity_warning || 10}" min="0" max="100">
      </div>
    `;

    // Add event listeners
    const fields = [
      'title', 'tank_in_service', 'tank_a_capacity', 'tank_b_capacity',
      'tank_a_capacity_percent', 'tank_b_capacity_percent', 'salt_level',
      'regeneration_active', 'regen_stage', 'regen_time_remaining',
      'flow_rate', 'daily_usage', 'total_usage',
      'tank_a_last_regen', 'tank_b_last_regen', 'brine_level_live',
      'low_salt_warning', 'low_capacity_warning'
    ];

    fields.forEach(field => {
      const element = this.querySelector(`#${field}`);
      if (element) {
        element.addEventListener('change', (e) => this._valueChanged(field, e.target.value));
        element.addEventListener('input', (e) => this._valueChanged(field, e.target.value));
      }
    });
  }

  _valueChanged(field, value) {
    if (!this._config) return;

    const newConfig = { ...this._config };

    if (field === 'low_salt_warning' || field === 'low_capacity_warning') {
      newConfig[field] = parseInt(value) || 0;
    } else {
      newConfig[field] = value;
    }

    this._config = newConfig;

    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Register the card
customElements.define('water-softener-card', WaterSoftenerCard);
customElements.define('water-softener-card-editor', WaterSoftenerCardEditor);

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'water-softener-card',
  name: 'Water Softener Card',
  description: 'A card to display Clack WS1 TT duplex water softener status',
  preview: true,
  documentationURL: 'https://github.com/jtricerolph/homeassistant-water-softener-card'
});

console.info(
  '%c WATER-SOFTENER-CARD %c v1.0.0 ',
  'color: white; background: #2196F3; font-weight: 700;',
  'color: #2196F3; background: white; font-weight: 700;'
);
