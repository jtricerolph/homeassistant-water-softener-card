# Water Softener Card

A custom Lovelace card for Home Assistant that displays the status of a Clack WS1 TT duplex water softener system.

## Features

- **Dual resin tanks (A & B)** - Visual display of capacity levels with colour-coded status
- **Brine/salt tank** - Shows salt level with water overlay during regeneration
- **Regeneration status** - Real-time stage and countdown timer
- **Flow statistics** - Current flow rate, daily and total water usage
- **Warning indicators** - Low salt and low capacity alerts

## Visual States

| State | Tank Display |
|-------|-------------|
| In Service | Blue fill, "IN SERVICE" badge |
| Standby | Grey fill, "STANDBY" badge |
| Regenerating | Orange pulsing fill with stage and timer |
| Low Capacity | Red warning indicator |
| Low Salt | Red warning on brine tank |

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Frontend" section
3. Click the three dots menu and select "Custom repositories"
4. Add `https://github.com/jtricerolph/homeassistant-water-softener-card` as a "Lovelace" repository
5. Click "Install"
6. Refresh your browser

### Manual Installation

1. Download `water-softener-card.js` from this repository
2. Copy it to your Home Assistant `www` folder
3. Add the resource in Home Assistant:
   - Go to Settings > Dashboards > Resources
   - Add `/local/water-softener-card.js` as a JavaScript Module

## Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:water-softener-card
title: Water Softener

# Required entities (from ESPHome)
tank_in_service: text_sensor.water_softener_tank_in_service
tank_a_capacity: sensor.water_softener_tank_a_capacity_remaining
tank_b_capacity: sensor.water_softener_tank_b_capacity_remaining
tank_a_capacity_percent: sensor.water_softener_tank_a_capacity_percent
tank_b_capacity_percent: sensor.water_softener_tank_b_capacity_percent
salt_level: sensor.water_softener_salt_level
regeneration_active: binary_sensor.water_softener_regeneration_active
regen_stage: text_sensor.water_softener_regen_stage
regen_time_remaining: sensor.water_softener_regen_time_remaining

# Optional entities
flow_rate: sensor.water_softener_water_flow_rate
daily_usage: sensor.water_softener_daily_water_usage
total_usage: sensor.water_softener_total_water_usage
tank_a_last_regen: text_sensor.water_softener_tank_a_last_regen
tank_b_last_regen: text_sensor.water_softener_tank_b_last_regen
brine_level_live: sensor.water_softener_brine_tank_level_live

# Thresholds (optional)
low_salt_warning: 20
low_capacity_warning: 10
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | "Water Softener" | Card title |
| `tank_in_service` | entity | required | Text sensor indicating active tank ("Tank A" or "Tank B") |
| `tank_a_capacity` | entity | required | Sensor for Tank A remaining capacity in litres |
| `tank_b_capacity` | entity | required | Sensor for Tank B remaining capacity in litres |
| `tank_a_capacity_percent` | entity | optional | Sensor for Tank A capacity as percentage |
| `tank_b_capacity_percent` | entity | optional | Sensor for Tank B capacity as percentage |
| `salt_level` | entity | required | Sensor for salt level percentage |
| `regeneration_active` | entity | required | Binary sensor for regeneration status |
| `regen_stage` | entity | required | Text sensor for current regeneration stage |
| `regen_time_remaining` | entity | optional | Sensor for regeneration countdown in minutes |
| `flow_rate` | entity | optional | Sensor for current water flow rate |
| `daily_usage` | entity | optional | Sensor for daily water consumption |
| `total_usage` | entity | optional | Sensor for total water consumption |
| `tank_a_last_regen` | entity | optional | Text sensor for Tank A last regeneration datetime |
| `tank_b_last_regen` | entity | optional | Text sensor for Tank B last regeneration datetime |
| `brine_level_live` | entity | optional | Sensor for live brine tank water level during regen |
| `low_salt_warning` | number | 20 | Percentage threshold for low salt warning |
| `low_capacity_warning` | number | 10 | Percentage threshold for low capacity warning |

## ESPHome Integration

This card is designed to work with ESPHome sensors monitoring a Clack WS1 TT duplex water softener. The ESPHome configuration should provide:

- **GPIO for Relay 1** - Water consumption pulses
- **GPIO for Relay 2** - Regeneration active signal
- **Ultrasonic sensor** - Salt level measurement in brine tank

### Regeneration Stages

The card recognises these regeneration stages:
- Backwash
- Brine Draw
- Fast Rinse
- Brine Fill
- Completing

## How It Works

### Duplex Tank Operation
1. Tank A treats water while Tank B is on standby
2. When Tank A capacity is depleted, regeneration triggers
3. Valve switches to Tank B (now in service)
4. Tank A regenerates (~2 hours)
5. After regeneration, Tank A goes on standby
6. Cycle repeats with tanks alternating

### Salt Level Measurement
The brine tank normally contains water that dissolves salt. During regeneration, the "Brine Draw" phase sucks out the water, exposing the true salt surface. The salt level shown is the authoritative measurement taken at the end of regeneration.

## Troubleshooting

**Card not appearing:**
- Clear browser cache (Ctrl+Shift+R)
- Check that the resource is registered correctly
- Check browser console for errors

**Entities showing N/A:**
- Verify entity IDs match your ESPHome configuration
- Check that ESPHome device is online

## License

MIT License - see LICENSE file for details.
