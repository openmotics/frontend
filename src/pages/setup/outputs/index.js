/*
 * Copyright (C) 2016 OpenMotics BV
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Output} from 'containers/gateway/output';
import {Shutter} from 'containers/gateway/shutter';
import {Room} from 'containers/room';
import {EventsWebSocketClient} from 'components/websocket-events';
import {upperFirstLetter} from 'resources/generic';

@inject(DialogService, Factory.of(Output), Factory.of(Shutter), Factory.of(Room))
export class Outputs extends Base {
    constructor(dialogService, outputFactory, shutterFactory, roomFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.outputFactory = outputFactory;
        this.shutterFactory = shutterFactory;
        this.roomFactory = roomFactory;
        this.type = '';
        this.webSocket = new EventsWebSocketClient(['OUTPUT_CHANGE', 'SHUTTER_CHANGE']);
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
            this.loadOutputsConfiguration().then(() => {
                this.signaler.signal('reload-outputs');
                this.signaler.signal('reload-outputs-shutters');
            });
            this.loadShuttersConfiguration().then(() => {
                this.signaler.signal('reload-shutters');
                this.signaler.signal('reload-outputs-shutters');
            });
            if (!this.webSocket.isAlive(30)) {
                this.loadOutputStatus().then(() => {
                    this.signaler.signal('reload-outputs');
                    this.signaler.signal('reload-outputs-shutters');
                });
                this.loadShutterStatus().then(() => {
                    this.signaler.signal('reload-shutters');
                    this.signaler.signal('reload-outputs-shutters');
                });
            }
            this.loadRoomConfigurations().catch(() => {});
        }, 60000);
        this.Output = Output;
        this.Shutter = Shutter;
        this.initVariables();
    }

    initVariables() {
        this.outputs = [];
        this.outputMap = {};
        this.outputsLoading = true;
        this.activeOutput = undefined;
        this.outputUpdating = false;
        this.shutters = [];
        this.shutterMap = {};
        this.shuttersLoading = true;
        this.rooms = [];
        this.roomsMap = {};
        this.roomsLoading = true;
        this.filters = ['unconfigured', 'notinuse', 'light', 'valve', 'outlet', 'alarm', 'generic', 'pump', 'appliance', 'hvac', 'motor', 'ventilation', 'heater', 'dimmer', 'relay', 'virtual', 'shutter'];
        this.filter = ['unconfigured', 'light', 'valve', 'outlet', 'alarm', 'generic', 'pump', 'appliance', 'hvac', 'motor', 'ventilation', 'heater', 'dimmer', 'relay', 'virtual', 'shutter'];
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
    }

    @computedFrom('outputs', 'filter', 'activeOutput')
    get filteredOutputs() {
        let outputs = [];
        outputs = this.outputs.filter(output => {
            if ((this.filter.contains('dimmer') && output.isDimmer) ||
                this.filter.contains('unconfigured') && output.name.toLowerCase() === this.i18n.tr('generic.noname').toLowerCase() ||
                this.filter.contains('relay') && !output.isLight && !output.isBrainShutter ||
                (this.filter.contains('virtual') && output.isVirtual) ||
                (this.filter.contains('notinuse') && !output.inUse)) {
                    return true;
                }
            return this.filter.includes(output.outputType);
        });
        if (this.activeOutput instanceof Output && !outputs.contains(this.activeOutput)) {
            this.activeOutput = undefined;
        }
        return outputs;
    }

    @computedFrom('outputs', 'filter', 'activeOutput')
    get filteredBrainOutputs() {
        return this.filteredOutputs.filter((_, index) => index % 2 !== 1);
    }

    @computedFrom('shutters', 'filter', 'activeOutput', 'shared.installation.isBrainPlatform')
    get filteredShutters() {
        if (this.shared.installation.isBrainPlatform) {
            return [];
        }
        let shutters = [];
        for (let shutter of this.shutters) {
            if (this.filter.contains('shutter') ||
                this.filter.contains('unconfigured') && shutter.name.toLowerCase() === this.i18n.tr('generic.noname').toLowerCase() ||
                (this.filter.contains('notinuse') && !shutter.inUse)) {
                shutters.push(shutter);
            }
        }
        if (this.activeOutput instanceof Shutter && !shutters.contains(this.activeOutput)) {
            this.activeOutput = undefined;
        }
        return shutters;
    }

    hasPair(output) {
        if (!this.shared.installation.isBrainPlatform) {
            return undefined;
        }

        const outputs = this.filteredOutputs;
        const outputIndex = outputs.indexOf(output)

        if (outputIndex % 2 === 1) {
            return undefined;
        }

        return outputs[outputIndex + 1];
    }

    hasPairShutterType(output) {
        const pairedOutput = this.hasPair(output);

        if (pairedOutput) {
            return output.outputType === 'shutter' || pairedOutput.outputType === 'shutter';
        }

        return output.outputType === 'shutter';
    }

    getOutputIdentifier(output) {
        const firstPairId = output.id % 2 === 1 ? output.id - 1 : output.id;
        const firstPair = this.outputs.find(item => item.id === firstPairId);
        const pair = this.hasPair(firstPair);
        if (pair && (firstPair.outputType === 'shutter' || pair.outputType === 'shutter')) {
            return this.pairOutputsShutter(firstPairId).identifier;
        } else {
            return output.identifier;
        }
    }

    pairOutputsShutter(outputId) {
        return this.shutters.find(shutter => shutter.id === outputId / 2);
    }

    isPairSelected(output) {
        return this.shared.installation.isBrainPlatform && this.hasPairShutterType(output) && this.activeOutput instanceof Shutter && this.activeOutput?.id === this.pairOutputsShutter(output.id).id;
    }

    filterText(filter) {
        return this.i18n.tr(`pages.setup.outputs.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-outputs');
        this.signaler.signal('reload-shutters');
        this.signaler.signal('reload-outputs-shutters');
    }

    selectAll() {
        this.filter = this.filters;
        this.filterUpdated();
    }

    selectNone() {
        this.filter = [];
        this.filterUpdated();
    }

    async processEvent(event) {
        // TODO replace with gateway event subscriptions
        const gatewayId = event.data.location?.gateway_id;
        if (gatewayId !== undefined && gatewayId != this.shared.openMoticGateway?.id) {
            return;
        }
        switch (event.type) {
            case 'OUTPUT_CHANGE': {
                let output = this.outputMap[event.data.id];
                if (output !== undefined) {
                    output.status = event.data.status.on ? 1 : 0;
                    output.dimmer = event.data.status.value;
                }
                break;
            }
            case 'SHUTTER_CHANGE': {
                let shutter = this.shutterMap[event.data.id];
                if (shutter !== undefined) {
                    shutter.status = event.data.status.state.toLowerCase();
                }
                break;
            }
        }
    }

    async loadRoomConfigurations() {
        try {
            let rooms = await this.api.getRoomConfigurations();
            Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                this.roomsMap[id] = room;
                return room;
            });
            this.roomsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    async loadOutputsConfiguration() {
        try {
            let configurationData = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(configurationData.config, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[id] = output;
                return output;
            });
            this.outputs.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Ouptut configurations: ${error.message}`);
        }
    }

    async loadOutputStatus() {
        try {
            const statuses = (await this.api.getOutputStatus({}))?.status || [];
            statuses.forEach(status => {
                const output = this.outputs.find(item => item.id === status.id);
                if (output) {
                    output.status = status.status ? 1 : 0;
                    output.dimmer = status.dimmer;
                    output.locked = status.locked;
                }
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Ouptut statusses: ${error.message}`);
        }
    }

    async loadShuttersConfiguration() {
        try {
            let configurationData = await this.api.getShutterConfigurations();
            Toolbox.crossfiller(configurationData.config, this.shutters, 'id', (id) => {
                let shutter = this.shutterFactory(id);
                this.shutterMap[id] = shutter;
                return shutter;
            });
            this.shutters.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.shuttersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Shutter configurations: ${error.message}`);
        }
    }

    async loadShutterStatus() {
        try {
            const statuses = (await this.api.getShutterStatus({}))?.status || [];
            statuses.forEach((status, id) => {
                const shutter = this.shutters.find(shutter => shutter.id === id);
                if (shutter !== undefined) {
                    shutter.status = status;
                }
            });
            this.shuttersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Shutter statusses: ${error.message}`);
        }
    }

    selectOutput(type, id) {
        let foundOutput = undefined;
        let updatedType;
        if (this.shared.installation.isBrainPlatform) {
            updatedType = type === 'output' ? this.hasPairShutterType(this.outputs.find(o => o.id === id)) ? 'shutter' : 'output' : 'output';
        } else {
            updatedType = type;
        }
        this.type = updatedType;
        if (updatedType === 'output') {
            for (let output of this.outputs) {
                if (output.id === id) {
                    foundOutput = output;
                }
            }
        } else if (updatedType === 'shutter') {
            for (let shutter of this.shutters) {
                if (this.shared.installation.isBrainPlatform) {
                    if (shutter.id === id / 2) {
                        foundOutput = shutter;
                    }
                } else if (shutter.id === id) {
                    foundOutput = shutter;
                }
            }
        }
        this.activeOutput = foundOutput;
        this.signaler.signal('active-output-updated');
    }

    async save() {
        this.outputUpdating = true
        if (this.activeOutput instanceof Output) {
            await this.configureOutputViewModel.save(this.activeOutput, this.hasPair(this.activeOutput));
            if (this.shared.installation.isBrainPlatform) {
                document.getElementById('output-' + this.activeOutput.id).click();
            }
        } else {
            await this.configureShutterViewModel.beforeSave();
        }
        this.signaler.signal('active-output-updated');
        this.outputUpdating = false;
    }

    toLowerText = (text) => upperFirstLetter(this.i18n.tr(text))

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.webSocket.close();
    }
}
