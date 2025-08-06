# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ELC-Themer is a Figma plugin built with Create Figma Plugin framework that enables component swapping between Enterprise and Brand (local-tier) libraries. It provides theme application capabilities with two main modes: ThemeSelector for regular files and ThemeVisualizer for sandbox files.

## Development Commands

### Build and Development
- `npm run build` - Build CSS and JS (runs both build:css and build:js)
- `npm run build:css` - Compile Tailwind CSS from src/styles/input.css to src/styles/output.css
- `npm run build:js` - Build Figma plugin with TypeScript checking and minification
- `npm run watch` - Build CSS then start concurrent watchers for both CSS and JS
- `npm run watch:css` - Watch and rebuild CSS automatically
- `npm run watch:js` - Watch and rebuild JS with TypeScript checking

### Plugin Testing
Install the plugin by importing `manifest.json` in Figma desktop app via "Import plugin from manifest…"

## Architecture

### Core Plugin Structure
- **main.ts**: Main plugin thread handling Figma API interactions, event listeners, and theme application logic
- **ui.tsx**: Plugin UI entry point that renders either ThemeSelector or ThemeVisualizer based on file type
- **events.ts**: Event constants for communication between main thread and UI

### Key Components
- **ThemeSelector** (`src/ui/theme-selector.tsx`): Main interface for selecting and applying themes
- **ThemeVisualizer** (`src/ui/theme-visualizer/`): Sandbox mode for visualizing theme applications with state management

### Theme System
- **themes.ts**: Core theme loading, filtering, and sorting logic. Loads from team library variable collections filtered by config.themeCollections
- **themers/**: Theme application engines
  - **themer.ts**: Main orchestrator that applies both metadata and variable theming
  - **themer-meta-data.ts**: Handles component swapping via metadata tags
  - **themer-variables.ts**: Handles variable collection application

### Event-Driven Architecture
Communication between main thread and UI uses events defined in events.ts:
- Theme operations: TOGGLE_FAVORITE, APPLY_THEME, THEMES, THEME_APPLIED
- UI interactions: SELECT_NODE, ZOOM_TO_COMPONENT
- Local variables: GET_LOCAL_VARIABLES, SEARCH_NODES_WITH_VARIABLE
- Visualizer: APPLY_ACCENT_STYLING, CLEAR_VISUALIZATIONS

### Configuration
- **config.ts**: Core configuration including namespace, theme collection names ('1.theme', '2.responsive', '3.swap'), and sandbox file detection
- **tokens.json**: Plugin dimensions and UI sizing tokens

### Component Swapping System
The plugin implements a two-way component swap system:
- Enterprise → Brand: Uses local variable collections to store Brand component keys
- Brand → Enterprise: Uses component descriptions to store Enterprise keys
- Requires ELC-Admin plugin for initial setup/tagging of component pairs