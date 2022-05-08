/** @odoo-module **/

import KanbanController from "web.KanbanController";
import DataExport from "web.DataExport";
import dialogs from "web.view_dialogs";
import Dialog from "web.Dialog";
import { qweb, _lt } from "web.core";


const ScoreCardKanbanController = KanbanController.extend({
    events: _.extend({}, KanbanController.prototype.events, {
        "change #kpi_period": "_onChangePeriod",
        "click .kpi-kanban-set-targets-button": "_onSetTargets",
        "click .kpi-kanban-replace-targets-button": "_onReplaceTargets",
        "click .kpi-kanban-export-targets-button": "_onExportScoreCard",
        "click .kpi-kanban-open-period": "_onOpenPeriods",
        "click .kpi-kanban-calculate-period": "_onCalculate",
        "click .kpi-kanban-close-period": "_onClosePeriod",
        "click .kpi-kanban-re-open-period": "_onReOpenPeriod",
        "click #clear_kpi_categories": "_onClearCategories",
        "click .kpi-edit-target": "_onChangeTarget",
        "click .kpi-remove-target": "_onDeleteTarget",
        "click .kpi-show-history": "_onShowHistory",
    }),
    jsLibs: [
        '/kpi_scorecard/static/lib/draggabilly/draggabilly.pkgd.js',
        '/kpi_scorecard/static/lib/jstree/jstree.js',
        '/web/static/lib/Chart/Chart.js',
    ],
    cssLibs: [
        '/kpi_scorecard/static/lib/jstree/themes/default/style.css',
    ],
    init: function () {
        this._super.apply(this, arguments);
        this.nonavigation_update = false;
        this.navigationExist = false;
    },
    /*
     * Re-write to add class for content area
    */ 
    start: function () {
        this.$('.o_content').addClass('kpi-kanban-flex');
        return this._super.apply(this, arguments);
    },
    /*
     * Re-write to avoid rerendering left navigation panel and apply domain
    */
    update: function (params, options) {
        var domain = params.domain || []
        this.nonavigation_update = true;
        params.kpiDomain =  this._renderKPIs();
        return this._super(params, options);
    },
    /* 
     * Re-write to render left navigation panel
    */
    _update: function () {
        var self = this;
        var def = $.Deferred();
        this._super.apply(this, arguments).then(function (res) {
            var state = self.model.get(self.handle);              
            self._renderHierarchy();
            if (self.navigationExist) {
                def.resolve(res);
            }
            else {
                self._renderNavigationPanel().then(function () {
                    def.resolve(res);
                });
            };
        });
        return def
    },
    /*
     * Re-write to construct own buttons
    */
    renderButtons: function ($node) {
        this.$buttons = $(qweb.render('KPIkanban.buttons'));
        this.$buttons.appendTo($node);
        this.updateButtons();
    },
    /*
     * Re-write to force reload
    */
    _reloadAfterButtonClick: function (kanbanRecord, params) {
        var self = this;
        $.when(this._super.apply(this, arguments)).then(function () {
            self.reload();
        });
    },
    /*
     * The method to apply correct padding based on parent-children hierarchy
    */
    _renderHierarchy: function () {
        var self = this;
        var allVisibleItems = self.$(".kpi-kanban-info");
        _.each(allVisibleItems, async function (info) {
            var parentIDS = info.getAttribute("data-parent");
            if (!parentIDS) {
                info.setAttribute("style", "padding-left:0;");
            }
            else {
                var searchIDS = parentIDS.split(",");
                var searchIDSCount = searchIDS.length;
                var selector = "";
                _.each(searchIDS, async function (parent_id) {
                    selector = selector + ".kpi-kanban-info[data-id='" + parent_id + "']";
                    searchIDSCount --;
                    if (searchIDSCount <= 0) {
                        var parentItem = self.$(selector);                         
                        info.setAttribute("style", "padding-left:" + (parentItem.length * 20).toString() +  "px;");
                    }
                    else {
                        selector = selector + ",";
                    }
                });
            };
        });
    },
    /*
     * The method to render left navigation panel
    */
    _renderNavigationPanel: function () {
        var self = this;
        var scrollTop = self.$('.kpi-kanban-navigation').scrollTop();
        self.$('.kpi-kanban-navigation').remove();
        var $navigationPanel = $(qweb.render('KPINavigationPanel', {}));
        self.$('.o_content').prepend($navigationPanel);
        var def = $.Deferred()
        self._renderPeriods().then(function () {
            self._renderCategories().then(function () {
                def.resolve();
            });
        });
        self.$('.kpi-kanban-navigation').scrollTop(scrollTop || 0);
        self.navigationExist = true;
        return def
    },
    /*
     * The method to render period selection
    */
    _renderPeriods: function() {
        var self = this;
        var def = $.Deferred();
        self._rpc({
            model: "kpi.period",
            method: 'action_return_periods',
            args: [],
        }).then(function (periodsDict) {
            var kpiEL = self.$("#kpi_periods");
            self.kpiAdmin = periodsDict.kpi_adming_rights;
            if (kpiEL && kpiEL.length != 0) {
                kpiEL[0].innerHTML = qweb.render('KPINavigationPeriods', periodsDict);
            };
            def.resolve();
        });
        return def
    },
    /*
     * The method to render jstree of categories
    */
    _renderCategories: function() {
        var self = this;
        self.$('#kpi_kanban_categories').jstree('destroy');
        var def = $.Deferred();
        self._rpc({
            model: "kpi.category",
            method: "action_return_nodes",
            args: [],
        }).then(function (kpiCategories) {
            var jsTreeOptions = {
                'core' : {
                    'themes': {'icons': false},
                    'check_callback' : true,
                    'data': kpiCategories,
                    "multiple" : true,
                },
                "plugins" : [
                    "checkbox",
                    "state",
                    "search",
                ],
                "state" : { "key" : "kpi_categories" },
                "checkbox" : {
                    "three_state" : false,
                    "cascade": "down",
                    "tie_selection" : false,
                },
            };
            var ref = self.$('#kpi_kanban_categories').jstree(jsTreeOptions);
            self.$('#kpi_kanban_categories').on("state_ready.jstree", self, function (event, data) {
                self.reload({"domain": self.model.get(self.handle).domain});
                // We register 'checks' only after restoring the tree to avoid multiple checked events
                self.$('#kpi_kanban_categories').on("check_node.jstree uncheck_node.jstree", self, function (event, data) {
                    self.reload();
                })
            });
            def.resolve();
        });
        return def;
    },
    /*
     * The method to update btn visibility based on rights and period
    */ 
    updateButtons: function () {
        this._super.apply(this, arguments);
        var self = this;
        var conditionsDict = {
            "period": !self._isPeriodNotSet(),
            "open":  self.KPIPeriodState == "open",
            "closed": self.KPIPeriodState == "closed",
            "admin": self.kpiAdmin,
        }
        var allButtons = self.$(".kpi-kanban-conditional");
        _.each(allButtons, function (btn) {
            var vConditions = btn.getAttribute("kpi-required").split(",");
            var counter = vConditions.length;
            _.each(vConditions, function (vcond) {
                if (!conditionsDict[vcond]) {
                    $(btn).addClass("kpi-hidden");
                    return false
                };
                counter --;
                if (counter == 0) {
                    $(btn).removeClass("kpi-hidden");
                }
            })
        });
    },
    /*
     * The method to reload controller when period is changed
    */
    _onChangePeriod: function(event) {
        this.reload();
    },
    /*
     * The method clear all checked sections
    */
    _onClearCategories: function(event) {
        var self = this;
        var ref = self.$('#kpi_kanban_categories').jstree(true);
        ref.uncheck_all();
        ref.save_state()
        self.reload();
    },
    /*
     * The method to prepare new filters and trigger articles rerender
    */
    _renderKPIs: function () {
        var self = this;
        var domain = [];
        // categories domain
        var refS = self.$('#kpi_kanban_categories').jstree(true);
        if (refS) {
            var checkedCategories = refS.get_checked();
            var checkedCategoriesIDS = checkedCategories.map(function(item) {
                return parseInt(item, 10);
            });
            if (checkedCategoriesIDS.length != 0) {
                domain.push(['category_id', 'in', checkedCategoriesIDS]);
            };
        };
        // period domain
        var periodID = -1,
            KPIPeriodState = false,
            periodEl = self.$("#kpi_period");
        if (periodEl && periodEl.length) {
            var chosenPeriod = periodEl[0];
            if (chosenPeriod.value) {
                periodID = parseInt(chosenPeriod.value);
                KPIPeriodState = chosenPeriod.options[chosenPeriod.selectedIndex].getAttribute("kpi_state");
            }
        };
        domain.push(['period_id', '=', periodID]);
        self.KPIperiodID = periodID;
        self.KPIPeriodState = KPIPeriodState;
        return domain
    },
    /*
     * the method to set targets (open new window)
    */
    _onSetTargets: function(event) {
        var self = this
        if (!self._isPeriodNotSet() && self.KPIPeriodState == "open") {
            var onSaved = function(record) {
                self.reload();
            };
            new dialogs.FormViewDialog(self, {
                res_model: "kpi.scorecard.line",
                title: _lt("Set Target"),
                readonly: false,
                shouldSaveLocally: false,
                on_saved: onSaved,
                context: {"default_period_id": self.KPIperiodID},
            }).open();
        };
    },
    /*
     * The method to set targets (open new widnow)
    */
    _onReplaceTargets: function(event) {
        var self = this
        if (!self._isPeriodNotSet() && self.kpiAdmin && self.KPIPeriodState == "open") {             
            self.do_action("kpi_scorecard.kpi_copy_template_action", {
                on_close: self.reload.bind(self, {}),
                additional_context: {"default_period_id": self.KPIperiodID},
            });       
        };
    },
    /*
     * The method to prepare and download xls table
    */
    _onExportScoreCard: function(event) {
        var self = this
        if (!self._isPeriodNotSet()) {
            self._rpc({
                model: "kpi.period",
                method: 'action_export_scorecard',
                args: [self.KPIperiodID],
            }).then(function (action) {
                self.do_action(action);
            }); 
        };
    },
    /*
     * The method to open the wizard for preparing periods
    */
    _onOpenPeriods: function(event) {
        var self = this;
        if (self.kpiAdmin) {
            var onSaved = function(record) {
                self._renderPeriods().then(function () {
                    self.$("#kpi_period")[0].value = record.data.id.toString();
                    self.reload();
                });
            };
            new dialogs.FormViewDialog(self, {
                res_model: "kpi.period",
                title: _lt("Open New Period"),
                readonly: false,
                shouldSaveLocally: false,
                on_saved: onSaved,
                context: {"quick_kpi_period": true},
            }).open();
        };
    },
    /*
     * The method to open the wizard for preparing periods
    */
    _onCalculate: function(event) {
        var self = this;
        if (!this._isPeriodNotSet() && self.KPIPeriodState == "open") {
            self._rpc({
                model: "kpi.period",
                method: 'action_calculate_kpis',
                args: [self.KPIperiodID],
            }).then(function () {
                self.reload();
            });                
        };
    },
    /*
     * The method to close period
    */
    _onClosePeriod: function(event) {
        if (! confirm(_lt("Do you really want to close the period? Actual values by its targets would be frozen then."))){ 
            return false; 
        }
        var self = this;
        if (!this._isPeriodNotSet() && self.kpiAdmin && self.KPIPeriodState == "open") {
            self._rpc({
                model: "kpi.period",
                method: 'action_close',
                args: [[self.KPIperiodID]],
            }).then(function () {
                self._renderPeriods().then(function () {
                    self.$("#kpi_period")[0].value = self.KPIperiodID.toString();
                    self.reload();
                });
            }); 
        };
    },
    /*
     * The method to re-open periods
    */
    _onReOpenPeriod: function(event) {
        var self = this;
        if (!this._isPeriodNotSet() && self.kpiAdmin && self.KPIPeriodState == "closed") {
            self._rpc({
                model: "kpi.period",
                method: 'action_reopen',
                args: [[self.KPIperiodID]],
            }).then(function () {
                self._renderPeriods().then(function () {
                    self.$("#kpi_period")[0].value = self.KPIperiodID.toString();
                    self.reload();
                });
            }); 
        };
    },
    /* 
     * The method to update KPI target
    */
    _onChangeTarget: function(event) {
        var self = this;
        if (!self._isPeriodNotSet() && self.KPIPeriodState == "open") {
            var onSaved = function(record) {
                self.reload();
            };
            new dialogs.FormViewDialog(self, {
                res_model: "kpi.scorecard.line",
                title: _lt("Update Target"),
                res_id: parseInt(event.currentTarget.getAttribute("data-id")),
                readonly: false,
                shouldSaveLocally: false,
                on_saved: onSaved,
            }).open();
        };
    },
    /*
     * The method to remove KPI target
    */
    _onDeleteTarget: function(event) {
        var self = this;
        if (! confirm(_lt("Do you really want to delete this target?"))){ 
            return false; 
        }
        if (!self._isPeriodNotSet() && self.KPIPeriodState == "open") {
            self._rpc({
                model: "kpi.scorecard.line",
                method: 'unlink',
                args: [[parseInt(event.currentTarget.getAttribute("data-id"))]],
            }).then(function () {
                self.reload();
            }); 
        };
    },
    /*
     * The method to show history of KPI actual values
    */
    _onShowHistory: function(event) {
        var self = this;
        self._rpc({
            model: "kpi.scorecard.line",
            method: 'action_get_history',
            args: [[parseInt(event.currentTarget.getAttribute("data-id"))]],
        }).then(function (values) {
            var historyDialogInstance = new HistoryDialog(this, {}, values);
            historyDialogInstance.open();
        }); 
    },
    /*
     * The method to define whether the period is set and the user can change targets
    */
    _isPeriodNotSet: function() {
        return (!this.KPIperiodID || this.KPIperiodID == -1);
    },
});

var HistoryDialog = Dialog.extend({
    template: 'KPIHistoryDialog',
    /*
     * Re-write to apply own settings and values
    */
    init: function (parent, options, values) {
        this.all_similar_targets = values.all_similar_targets;
        this.similar_targets = values.similar_targets;
        this._super(parent, _.extend({}, {
            title: values.kpi_name,
        }, options || {}));
    },
    /*
     * Re-write to render chart and KPIs table
    */
    renderElement: function () {
        this._super();
        var self = this;
        this._activateChart();
    },
    /*
     * The method to construct line chart for history
    */
    _activateChart: function() {
        var data = [];
        var labels = [];
        this.similar_targets.forEach(function (pt) {
            labels.push(pt.date);
            data.push(pt.value);
        });
        var config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    fill: 'start',
                    label: _lt("KPI History"),
                    backgroundColor: '#539dd2',
                    borderColor: '#6aa1ca',
                }],
            },
        };
        var context = this.$('#kpi_history_chart')[0].getContext('2d');
        new Chart(context, config);
    },
});

export default ScoreCardKanbanController;
