/*
 * Copyright (C) 2019 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {computedFrom} from 'aurelia-framework';
import {BaseObject} from './baseobject';

export class ThermostatGroupCloud extends BaseObject {
    constructor(...rest) {
        let id = rest.pop();  // Inverted order
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.processing = false;
        this._acl = undefined;
        this.capabilities = undefined;
        this.status = undefined;
        
        this.mapping = {
            id: 'id',
            _acl: '_acl',
            capabilities: 'capabilities',
            status: 'status'
        };

    }

    @computedFrom('status.mode')
    get isHeating() {
        return this.status.mode === 'HEATING';
    }

    set isHeating(mode) {

    }

    async setMode() {
        if (this.status.mode === 'HEATING') {
            this.status.mode = 'COOLING';
            await this.api.setThermostatMode('COOLING');
        } else {
            this.status.mode = 'HEATING';
            await this.api.setThermostatMode('HEATING');
        }
        return;
    }

    async setPreset(preset) {
        this.api.setThermostatPreset(preset.toUpperCase());
    }
}