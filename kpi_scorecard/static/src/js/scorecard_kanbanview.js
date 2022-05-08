/** @odoo-module **/

import ScoreCardKanbanController from "@kpi_scorecard/js/scorecard_kanbancontroller";
import ScoreCardKanbanModel from "@kpi_scorecard/js/scorecard_kanbanmodel";
import KanbanView from "web.KanbanView";
import viewRegistry from 'web.view_registry';
import { _lt } from "web.core";

const ScoreCardKanbanView = KanbanView.extend({
    config: _.extend({}, KanbanView.prototype.config, {
        Controller: ScoreCardKanbanController,
        Model: ScoreCardKanbanModel,
    }),
    searchMenuTypes: ['filter', 'favorite'],
    display_name: _lt('KPI Scorecard'),
    groupable: false,
});

viewRegistry.add("scorecard_kanban", ScoreCardKanbanView);

export default ScoreCardKanbanView;
