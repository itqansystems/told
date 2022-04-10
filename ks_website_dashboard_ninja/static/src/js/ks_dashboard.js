odoo.define('ks_website_dashboard_ninja.ks_website_dashboard', function(require) {
    'use strict';

    var sAnimation = require('website.content.snippets.animation');
    var ajax = require('web.ajax');
    var ks_utils = require('web.utils');
    var core = require('web.core');
    var config = require('web.config');
    var time = require('web.time');
    var QWeb = core.qweb;
    var _t = core._t;
    var publicWidget = require('web.public.widget');
    ajax.loadXML('/ks_dashboard_ninja/static/src/xml/ks_dn_global_filter.xml', QWeb);
    ajax.loadXML('/ks_dashboard_ninja/static/src/xml/ks_dashboard_ninja_templates.xml', QWeb);
    ajax.loadXML('/ks_dashboard_ninja/static/src/xml/ks_dashboard_pro.xml', QWeb);
    ajax.loadXML('/ks_website_dashboard_ninja/static/src/xml/ks_website_no_item_template.xml', QWeb);
    ajax.loadXML('/ks_dashboard_ninja/static/src/xml/ks_to_do_template.xml', QWeb);



    publicWidget.registry.snippet_dashboard_home_page = publicWidget.Widget.extend({
        selector: '.ks_dynamic_dashboard',

        xmlDependencies: ['/ks_dashboard_ninja/static/src/xml/ks_dn_global_filter.xml',
        '/ks_website_dashboard_ninja/static/src/xml/ks_website_no_item_template.xml',
        '/ks_dashboard_ninja/static/src/xml/ks_dashboard_ninja_templates.xml',
        '/ks_dashboard_ninja/static/src/xml/ks_dashboard_pro.xml',
        '/ks_dashboard_ninja/static/src/xml/ks_to_do_template.xml'
        ],
        events: {
            'click ul#ks_date_selector_container li': '_ksOnDateFilterMenuSelect',
            'click .apply-dashboard-date-filter': '_onKsApplyDateFilter',
            'click .clear-dashboard-date-filter': '_onKsClearDateValues',
            'click #ks_chart_canvas_id': 'onChartCanvasClick',
            'click .ks_list_canvas_click': 'onChartCanvasClick',
            'click .ks_load_previous': 'ksLoadPreviousRecords',
            'click .ks_load_next': 'ksLoadMoreRecords',
            'click .ks_dashboard_item_drill_up': 'ksOnDrillUp',
            'click #ks_item_info': function(e) {
                e.stopPropagation();
            },
        },

        _ksOnDateFilterMenuSelect: function(e) {
            if (e.target.id !== 'ks_date_selector_container') {
                var ks_self = this;

                _.each($('.ks_date_filter_selected'), function($filter_options) {
                    $($filter_options).removeClass("ks_date_filter_selected")
                });

                $(e.target.parentElement).addClass("ks_date_filter_selected");
                $('#ks_date_filter_selection', this.$el).text(ks_self.ks_date_filter_selections[e.target.parentElement.id]);

                if (e.target.parentElement.id !== "l_custom") {
                    ks_self.$el.find('.ks_date_input_fields').addClass("ks_hide");
                    ks_self.$el.find('.ks_date_filter_dropdown').removeClass("ks_btn_first_child_radius");
                    e.target.parentElement.id === "l_none" ? ks_self._onKsClearDateValues() : ks_self._onKsApplyDateFilter();
                } else if (e.target.parentElement.id === "l_custom") {
                    $(".ks_wdn_start_date_picker", ks_self.$el).val(null).removeClass("ks_hide");
                    $(".ks_wdn_end_date_picker", ks_self.$el).val(null).removeClass("ks_hide");
                    $('.ks_date_input_fields', ks_self.$el).removeClass("ks_hide");
                    $('.ks_date_filter_dropdown', ks_self.$el).addClass("ks_btn_first_child_radius");
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                }
            }
        },

        getContext: function() {
            var ks_self = this;
            var context = {
                ksDateFilterSelection: ks_self.ksDateFilterSelection,
                ksDateFilterStartDate: ks_self.ksDateFilterStartDate,
                ksDateFilterEndDate: ks_self.ksDateFilterEndDate,
            }
            return Object.assign(context, ks_self._getContext())
        },

        _onKsApplyDateFilter: function() {
            var ks_self = this;

            var $target = ks_self.$target;
            var dashboard_id = $target.attr('data-id');
            var start_date = ks_self.$el.find(".ks_wdn_start_date_picker").val();
            var end_date = ks_self.$el.find(".ks_wdn_end_date_picker").val();
            if (start_date === "Invalid date" ) {
                alert("Invalid Date is given in Start Date.")
            } else if (end_date === "Invalid date") {
                alert("Invalid Date is given in End Date.")
            } else if (ks_self.$el.find('.ks_date_filter_selected').attr('id') !== "l_custom") {

                ks_self.ksDateFilterSelection = ks_self.$el.find('.ks_date_filter_selected').attr('id');

                $.when(ks_self.ks_fetch_items_data()).then(function() {
                    ks_self.ksUpdateDashboardItem(Object.keys(ks_self.config.ks_item_data));
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                });
            } else {
                if (start_date && end_date) {
                    if (!moment(start_date, ks_self.datetime_format).isValid()) {
                        alert("Invalid Date is given in Start Date.")
                    } else if (end_date === "Invalid date" || !moment(end_date, ks_self.datetime_format).isValid()) {
                        alert("Invalid Date is given in End Date.")
                    }else if (moment(start_date, ks_self.datetime_format) <= moment(end_date, ks_self.datetime_format)) {
                        var start_date = new moment(start_date, ks_self.datetime_format).format("YYYY-MM-DD H:m:s");
                        var end_date = new moment(end_date, ks_self.datetime_format).format("YYYY-MM-DD H:m:s");
                        if (start_date === "Invalid date" || end_date === "Invalid date"){
                            alert(_t("Invalid Date"));
                        }else{
                            ks_self.ksDateFilterSelection = ks_self.$el.find('.ks_date_filter_selected').attr('id');
                            ks_self.ksDateFilterStartDate = start_date;
                            ks_self.ksDateFilterEndDate = end_date;

                            $.when(ks_self.ks_fetch_items_data()).then(function() {
                                ks_self.ksUpdateDashboardItem(Object.keys(ks_self.config.ks_item_data));
                                ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                                ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).addClass("ks_hide");

                            });
                       }

                    } else {
                        alert(_t("Start date should be less than end date"));
                    }
                } else {
                    alert(_t("Please enter start date and end date"));
                }
            }
        },

        ksUpdateDashboardItem: function(ids) {
            var ks_self = this;

            for (var i = 0; i < ids.length; i++) {
                var item_data = ks_self.config.ks_item_data[ids[i]]

                if (item_data['ks_dashboard_item_type'] === "ks_list_view") {
                    var item_view = ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                    item_view.find('.card-body').empty();
                    item_view.find('.ks_dashboard_item_drill_up').addClass('d-none')
                    item_view.find('.card-body').append(ks_self._renderListViewData(item_data));
                    var rows = JSON.parse(item_data['ks_list_view_data']).data_rows;
                    var ks_length = rows ? rows.length : false;
                    if (ks_length) {
                        if (item_view.find('.ks_pager_name')) {
                            item_view.find('.ks_pager_name').empty();
                            var $ks_pager_container = QWeb.render('ks_pager_template', {
                                item_id: ids[i],
                                intial_count: item_data.ks_pagination_limit,
                                offset : 1
                            })
                            item_view.find('.ks_pager_name').append($($ks_pager_container));
                        }
                            if (ks_length < item_data.ks_pagination_limit) item_view.find('.ks_load_next').addClass('ks_event_offer_list');
                                item_view.find('.ks_value').text("1-" + JSON.parse(item_data['ks_list_view_data']).data_rows.length);

                            if (item_data.ks_record_data_limit == item_data.ks_pagination_limit || item_data.ks_record_count==item_data.ks_pagination_limit) {
                                item_view.find('.ks_load_next').addClass('ks_event_offer_list');
                            }
                    } else {
                        item_view.find('.ks_pager').addClass('d-none');
                    }
                } else if (item_data['ks_dashboard_item_type'] === "ks_tile") {
                    var item_view = ks_self._ksRenderDashboardTile(item_data);
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").empty();
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").append($(item_view).find('.ks_dashboarditem_id'));
                } else if (item_data['ks_dashboard_item_type'] === "ks_kpi") {
                    var item_view = ks_self.renderKpi(item_data);
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").empty();
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").append($(item_view).find('.ks_dashboarditem_id'));
                } else {
                    ks_self.grid.removeWidget(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]")[0]);
                    ks_self.ksRenderDashboardItems([item_data]);
                }
            }
            ks_self.grid.setStatic(true);
        },

        ks_fetch_data: function() {
            var ks_self = this;
            ks_self.dashboard_id = ks_self.$target.attr('data-id');
            return ajax.jsonRpc('/dashboard/data', 'call', {
                model: 'ks_dashboard_ninja.items',
                method: 'ks_dashboard_data_handler',
                args: [],
                kwargs: {
                    'id': Number(ks_self.dashboard_id),
                    'type': ks_self.data_selection,
                },
                context: ks_self.getContext(),
            }).then(function(data) {
                if (data !== "missingerror") {
                    if(! data.login){
                        ks_self.$el = ks_self.$target.empty();
                        if(data.type === 'user_data') {
                            $(QWeb.render('ksWebsiteNoItemNoUserView')).appendTo(ks_self.$el);
                            $('.ks_dashboard_header').addClass('ks_hide');
                            return false;
                        }
                        else if(data.type === 'all_data') {
                            ks_self.config = data;
                            return true;
                        }
                    }
                    else {
                        ks_self.config = data;
                        return true;
                    }
                }
            }.bind(ks_self));
        },

        _onKsClearDateValues: function() {
            var ks_self = this;
            var $target = ks_self.$target;
            var dashboard_id = $target.attr('data-id')
            var type = $target.attr('data-selection')

            ks_self.ksDateFilterSelection = 'l_none';
            ks_self.ksDateFilterStartDate = false;
            ks_self.ksDateFilterEndDate = false;

            $.when(ks_self.ks_fetch_items_data()).then(function() {
                ks_self.ksRenderDashboard($target,dashboard_id);
                $('.ks_date_input_fields').addClass("ks_hide");
                $('.ks_date_filter_dropdown').removeClass("ks_btn_first_child_radius");
            });
        },

        init: function(parent, state, params) {
            this._super.apply(this, arguments);
            this.form_template = 'ks_dashboard_ninja_template_view';
            this.gridstackConfig = {};
            var l10n = _t.database.parameters;
            this.ks_date_filter_selections = {
                'l_none': 'Date Filter',
                'l_day': 'Today',
                't_week': 'This Week',
                't_month': 'This Month',
                't_quarter': 'This Quarter',
                't_year': 'This Year',
                'n_day': 'Next Day',
                'n_week': 'Next Week',
                'n_month': 'Next Month',
                'n_quarter': 'Next Quarter',
                'n_year': 'Next Year',
                'ls_day': 'Last Day',
                'ls_week': 'Last Week',
                'ls_month': 'Last Month',
                'ls_quarter': 'Last Quarter',
                'ls_year': 'Last Year',
                'l_week': 'Last 7 days',
                'l_month': 'Last 30 days',
                'l_quarter': 'Last 90 days',
                'l_year': 'Last 365 days',
                'ls_past_until_now': 'Past till Now',
                'ls_pastwithout_now': 'Past Excluding Today',
                'n_future_starting_now': 'Future Starting Now',
                'n_futurestarting_tomorrow': 'Future Starting Tomorrow',
                'l_custom': 'Custom Filter',
            };
            this.ks_date_filter_selection_order = ['l_day', 't_week', 't_month', 't_quarter', 't_year', 'n_day',
                'n_week', 'n_month', 'n_quarter', 'n_year', 'ls_day', 'ls_week', 'ls_month', 'ls_quarter',
                'ls_year', 'l_week', 'l_month', 'l_quarter', 'l_year','ls_past_until_now', 'ls_pastwithout_now',
                    'n_future_starting_now', 'n_futurestarting_tomorrow', 'l_custom'
            ];
            this.date_format = time.strftime_to_moment_format(_t.database.parameters.date_format)
            this.date_format = this.date_format.replace(/\bYY\b/g, "YYYY");
            this.datetime_format = time.strftime_to_moment_format((l10n.date_format + ' ' + l10n.time_format));
            this.file_type_magic_word = {
                '/': 'jpg',
                'R': 'gif',
                'i': 'png',
                'P': 'svg+xml',
            };
            this.grid = false;
            this.ksChartColorOptions = ['default', 'cool', 'warm', 'neon'];
            this.chart_container = {};
            this.gridstack_options = {
                staticGrid: true,
                float: false,
                cellHeight : 80,
                styleInHead : true,
                disableOneColumnMode: true,
            };
            this.ksDateFilterSelection = false;
            this.ksDateFilterStartDate = false;
            this.ksDateFilterEndDate = false;
            this.ksUpdateDashboard = {};
        },


        start: function(dashboard_id, data_selection, ks_self_received) {
            var ks_self = this;
            if (dashboard_id == undefined) {
                dashboard_id = 0;
            }
            if (data_selection == undefined) {
                ks_self.data_selection = ks_self.$target.attr('data-selection');
            } else {
                ks_self.data_selection = data_selection;
            }
            if (ks_self_received !== undefined) {
                ks_self.ks_self_received = ks_self_received;
                ks_self.$el = ks_self_received.$el;
                ks_self.$target = ks_self_received.$target;
                ks_self.$target.attr('data-id', dashboard_id);
                ks_self.$target.attr('data-selection', data_selection);
                ks_self.$overlay = ks_self_received.$overlay;
                ks_self.data = ks_self_received.data;
                this.$el = ks_self_received.$target;
                this.$target = ks_self_received.$target;
                this.$overlay = ks_self_received.$overlay;
            }
            Chart.plugins.unregister(ChartDataLabels);
            ks_self.ks_set_default_chart_view();
            var dashboard_id = ks_self.$target.attr('data-id');
            $.when(ks_self.ks_fetch_data()).then(function(result) {
                if(result){
                    $.when(ks_self.ks_fetch_items_data()).then(function(result) {
                        var $target = ks_self.$target;
                        ks_self.ks_set_update_interval();
                        ks_self.ksRenderDashboard($target, dashboard_id);
                    });
                }
            });
        },

        ks_fetch_items_data: function() {
            var self = this;
            var items_promises = []
            self.config.ks_dashboard_items_ids.forEach(function(value) {
                items_promises.push(ajax.jsonRpc('/fetch/item/update', 'call', {
                    model: 'ks_dashboard_ninja.items',
                    method: 'ks_dashboard_data_handler',
                    args: [],
                    kwargs: {
                        'item_id': Number(value),
                        'dashboard': Number(self.dashboard_id),
                        'type': self.data_selection,
                        'params':self.ksGetParamsForItemFetch(value)
                    },
                    context: self.getContext(),
                }).then(function(result) {
                    self.config.ks_item_data[value] = result[value];
                }));
            });

            return Promise.all(items_promises)
        },

        ksRenderDashboard: function($target, dashboard_id) {
            var ks_self = this;
            ks_self.$el = $target.empty();
            var type = $target.attr('data-selection')
            ks_self.$el.addClass('ks_dashboard_ninja d-flex flex-column ks_dashboard_identifier_' + dashboard_id + '_' + type);
            var $ks_header = $(QWeb.render('ksDashboardNinjaHeader', {
                ks_dashboard_name: ks_self.config.name,
                ks_dashboard_manager: ks_self.config.ks_dashboard_manager,
                date_selection_data: ks_self.ks_date_filter_selections,
                date_selection_order: ks_self.ks_date_filter_selection_order,
                ks_dashboard_data: ks_self.config,
                ks_dn_pre_defined_filters: _(ks_self.config.ks_dashboard_pre_domain_filter).values().sort(function(a, b){return a.sequence - b.sequence}),
                play_button: true,
            }));
            $ks_header.find(".ks_dn_filter_selection_input").addClass("d-none")
            ks_self.$el.append($ks_header);
            ks_self.ksRenderDashboardMainContent();
        },

        ksSortItems: function(ks_item_data) {
            var items = []
            var ks_self = this;
            var item_data = Object.assign({}, ks_item_data);

            if (ks_self.config.ks_gridstack_config) {
                ks_self.gridstackConfig = JSON.parse(ks_self.config.ks_gridstack_config);
                var a = Object.values(ks_self.gridstackConfig);
                var b = Object.keys(ks_self.gridstackConfig);
                for (var i = 0; i < a.length; i++) {
                    a[i]['id'] = b[i];
                }
                a.sort(function(a, b) {
                    return (35 * a.y + a.x) - (35 * b.y + b.x);
                });
                for (var i = 0; i < a.length; i++) {
                    if (item_data[a[i]['id']]) {
                        items.push(item_data[a[i]['id']]);
                        delete item_data[a[i]['id']];
                    }
                }
            }

            return items.concat(Object.values(item_data));
        },

        ksRenderDashboardMainContent: function() {
            var ks_self = this;

            if (Object.keys(ks_self.config.ks_item_data).length) {
                ks_self._renderDateFilterDatePicker();
                $('.ks_dashboard_items_list', this.$el).remove();
                var $dashboard_body_container = $(QWeb.render('ks_main_body_container'))
                var $gridstackContainer = $dashboard_body_container.find(".grid-stack");
                $dashboard_body_container.appendTo(ks_self.$el)
                ks_self.grid = GridStack.init(ks_self.gridstack_options,$gridstackContainer[0]);
                var items = ks_self.ksSortItems(ks_self.config.ks_item_data);

                ks_self.ksRenderDashboardItems(items);

                // In gridstack version 0.3 we have to make static after adding element in dom
                ks_self.grid.setStatic(true);

            } else {
                ks_self.$el.find('.ks_dashboard_link').addClass("ks_hide");
                $(QWeb.render('ksWebsiteNoItemView')).appendTo(ks_self.$el)
            }
        },

        _ksRenderNoItemView: function() {
            var ks_self = this;
            $('.ks_dashboard_items_list', ks_self.$el).remove();
            ajax.jsonRpc('/check/user', 'call', {
                model: 'ks_dashboard_ninja.board',
                method: 'ks_check_user_login',
                args: [],
                kwargs: {},
            }).then(function(result) {
                if (result) {
                    $(QWeb.render('ksWebsiteNoItemView')).appendTo(ks_self.$el)
                } else {
                    ks_self.$el.empty();
                    $(QWeb.render('ksWebsiteNoItemNoUserView')).appendTo(ks_self.$el)
                }
            }.bind(this));

        },

        ksRenderDashboardItems: function(items) {
            var ks_self = this;
            ks_self.$el.find('.print-dashboard-btn').addClass("ks_pro_print_hide");

            if (ks_self.config.ks_gridstack_config) {
                ks_self.gridstackConfig = JSON.parse(ks_self.config.ks_gridstack_config);
            }
            var item_view;
            for (var i = 0; i < items.length; i++) {
                if (ks_self.grid) {
                    if (items[i].ks_dashboard_item_type === 'ks_tile') {
                        var item_view = ks_self._ksRenderDashboardTile(items[i])
                        if (items[i].id in ks_self.gridstackConfig) {
//                            self.grid.addWidget($(item_view), self.gridstackConfig[items[i].id].x, self.gridstackConfig[items[i].id].y, self.gridstackConfig[items[i].id].width, self.gridstackConfig[items[i].id].height, false, 6, null, 2, 2, items[i].id);
                             ks_self.grid.addWidget($(item_view)[0], {x:ks_self.gridstackConfig[items[i].id].x, y:ks_self.gridstackConfig[items[i].id].y, w:ks_self.gridstackConfig[items[i].id].w, h:ks_self.gridstackConfig[items[i].id].h,autoPosition:false,minW:2,maxW:null,minH:2,maxH:2,id:items[i].id,});
                        } else {
                             ks_self.grid.addWidget($(item_view)[0], {x:0, y:0, w:3, h:2,autoPosition:true,minW:2,maxW:null,minH:2,maxH:2,id:items[i].id});
                        }
                    } else if (items[i].ks_dashboard_item_type === 'ks_list_view') {
                        ks_self._renderListView(items[i], ks_self.grid)
                    } else if (items[i].ks_dashboard_item_type === 'ks_kpi') {
                        var $kpi_preview = ks_self.renderKpi(items[i])
                        var item_id = items[i].id;
                        if (items[i].id in ks_self.gridstackConfig) {
                            ks_self.grid.addWidget($kpi_preview[0], {x:ks_self.gridstackConfig[items[i].id].x, y:ks_self.gridstackConfig[items[i].id].y, w:ks_self.gridstackConfig[items[i].id].w, h:ks_self.gridstackConfig[items[i].id].h,autoPosition:false,minW:2,maxW:null,minH:2,maxH:2,id:items[i].id});
                        } else {
                             ks_self.grid.addWidget($kpi_preview[0], {x:0, y:0, w:3, h:2,autoPosition:true,minW:2,maxW:null,minH:2,maxH:2,id:items[i].id});
                        }
                    }else if (items[i].ks_dashboard_item_type === 'ks_to_do'){
                        var $to_do_preview = ks_self.ksRenderToDoDashboardView(items[i]);
                        if (items[i].id in ks_self.gridstackConfig) {
                            ks_self.grid.addWidget($to_do_preview[0], {x:ks_self.gridstackConfig[items[i].id].x, y:ks_self.gridstackConfig[items[i].id].y, w:ks_self.gridstackConfig[items[i].id].w, h:ks_self.gridstackConfig[items[i].id].h, autoPosition:false, minW:3, maxW:null, minH:2, maxH:null, id:items[i].id});
                        } else {
                            ks_self.grid.addWidget($to_do_preview[0], {x:0, y:0, w:5, h:4, autoPosition:true, minW:3, maxW:null, minH:2, maxH:null, id:items[i].id})
                        }
                    }
                    else {
                        ks_self._renderGraph(items[i], ks_self.grid)
                    }
                }
            }
        },

        _ks_get_rgba_format: function(val) {
            var rgba = val.split(',')[0].match(/[A-Za-z0-9]{2}/g);
            rgba = rgba.map(function(v) {
                return parseInt(v, 16)
            }).join(",");
            return "rgba(" + rgba + "," + val.split(',')[1] + ")";
        },

        ksNumFormatter: function(num, digits) {
            var negative;
            var si = [{
                    value: 1,
                    symbol: ""
                },
                {
                    value: 1E3,
                    symbol: "k"
                },
                {
                    value: 1E6,
                    symbol: "M"
                },
                {
                    value: 1E9,
                    symbol: "G"
                },
                {
                    value: 1E12,
                    symbol: "T"
                },
                {
                    value: 1E15,
                    symbol: "P"
                },
                {
                    value: 1E18,
                    symbol: "E"
                }
            ];
            if (num < 0) {
                num = Math.abs(num)
                negative = true
            }
            var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length - 1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
            if (negative) {
                return "-" + (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            } else {
                return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }
        },

        ksNumIndianFormatter: function(num, digits) {
            var negative;
            var si = [{
                value: 1,
                symbol: ""
            },
            {
                value: 1E3,
                symbol: "Th"
            },
            {
                value: 1E5,
                symbol: "Lakh"
            },
            {
                value: 1E7,
                symbol: "Cr"
            },
            {
                value: 1E9,
                symbol: "Arab"
            }
            ];
            if (num < 0) {
                num = Math.abs(num)
                negative = true
            }
            var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length - 1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
            if (negative) {
                return "-" + (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            } else {
                return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }

        },

        _onKsGlobalFormatter: function(ks_record_count, ks_data_format, ks_precision_digits){
            var self = this;
            if (ks_data_format == 'exact'){
                return self.ksFormatValue(ks_record_count, 'float', ks_precision_digits);
            }else{
                if (ks_data_format == 'indian'){
                    return self.ksNumIndianFormatter(ks_record_count, 1);
                }else if (ks_data_format == 'colombian'){
                    return self.ksNumColombianFormatter(ks_record_count, 1, ks_precision_digits);
                }else{
                    return self.ksNumFormatter(ks_record_count, 1);
                }
            }
        },

        ksNumColombianFormatter: function(num, digits, ks_precision_digits) {
            var negative;
            var si = [{
                    value: 1,
                    symbol: ""
                },
                {
                    value: 1E3,
                    symbol: ""
                },
                {
                    value: 1E6,
                    symbol: "M"
                },
                {
                    value: 1E9,
                    symbol: "M"
                },
                {
                    value: 1E12,
                    symbol: "M"
                },
                {
                    value: 1E15,
                    symbol: "M"
                },
                {
                    value: 1E18,
                    symbol: "M"
                }
            ];
            if (num < 0) {
                num = Math.abs(num)
                negative = true
            }
            var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length-1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
                if (si[i].symbol === 'M'){
//                si[i].value = 1000000;
                num = parseInt(num) / 1000000
                num = this.ksFormatValue(num, 'init', ks_precision_digits);
                if (negative) {
                    return "-" + num + si[i].symbol;
                } else {
                    return num + si[i].symbol;
                }
                }else{
                    if (num % 1===0){
                    num = this.ksFormatValue(num, 'init', ks_precision_digits)
                    }else{
                        num = this.ksFormatValue(num, 'float', ks_precision_digits);
                    }
                    if (negative) {
                        return "-" + num;
                    } else {
                        return num;
                    }
                }
        },

         ksFormatValue: function(value, field_type, ks_precision_digits) {
            if (value === false) {
                return "";
            }
            var l10n = core._t.database.parameters;
            var ks_decimal_precision = ks_precision_digits;
            var ks_formatted = _.str.sprintf('%.' + ks_decimal_precision + 'f', value || 0).split('.');
            ks_formatted[0] = ks_utils.insert_thousand_seps(ks_formatted[0]);
            if (field_type == 'init'){
                return ks_formatted[0]
            }else{
                return ks_formatted.join(l10n.decimal_point);
            }
        },

        _renderGraph: function(item) {
            var self = this;
            var chart_data = JSON.parse(item.ks_chart_data);
            var isDrill = item.isDrill ? item.isDrill : false;
            var chart_id = item.id,
                chart_title = item.name;
            var chart_title = item.name;
            var chart_type = item.ks_dashboard_item_type.split('_')[1];
            switch (chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    var chart_family = "square"
                    break;
                default:
                    var chart_family = "none";
                    break;

            }

            var $ks_gridstack_container = $(QWeb.render('ks_gridstack_container', {
                ks_chart_title: chart_title,
                ksIsDashboardManager: self.config.ks_dashboard_manager,
                ks_dashboard_list: self.config.ks_dashboard_list,
                chart_id: chart_id,
                chart_family: chart_family,
                chart_type: chart_type,
                ksChartColorOptions: this.ksChartColorOptions,
            })).addClass('ks_dashboarditem_id');
            $ks_gridstack_container.find('.ks_li_' + item.ks_chart_item_color).addClass('ks_date_filter_selected');

            if (chart_id in self.gridstackConfig) {
//                self.grid.addWidget($ks_gridstack_container, self.gridstackConfig[chart_id].x, self.gridstackConfig[chart_id].y, self.gridstackConfig[chart_id].width, self.gridstackConfig[chart_id].height, false, 11, null, 3, null, chart_id);
                  self.grid.addWidget($ks_gridstack_container[0], {x:self.gridstackConfig[chart_id].x, y:self.gridstackConfig[chart_id].y, w:self.gridstackConfig[chart_id].w, h:self.gridstackConfig[chart_id].h, autoPosition:false,minW:4,maxW:null,minH:3,maxH:null,id :chart_id});
            } else {
//                self.grid.addWidget($ks_gridstack_container, 0, 0, 13, 4, true, 11, null, 3, null, chart_id);
                  self.grid.addWidget($ks_gridstack_container[0], {x:0, y:0, w:5, h:4,autoPosition:true,minW:4,maxW:null,minH:3,maxH:null, id :chart_id});
            }
            self._renderChart($ks_gridstack_container, item);
        },

        ks_monetary: function(value, ks_currency, position) {
//            var currency = session.get_currency(currency_id);
            if (!ks_currency) {
                return value;
            }
            if (position === "after") {
                return value += ' ' + ks_currency;
            } else {
                return ks_currency + ' ' + value;
            }
        },


        _renderChart: function($ks_gridstack_container, item) {
            var self = this;
            var ks_currency = item.ks_currency_symbol;
            var position = item.ks_currency_position;
            var chart_data = JSON.parse(item.ks_chart_data);
            if (item.ks_chart_cumulative_field){

                for (var i=0; i< chart_data.datasets.length; i++){
                    var ks_temp_com = 0
                    var data = []
                    var datasets = {}
                    if (chart_data.datasets[i].ks_chart_cumulative_field){
                        for (var j=0; j < chart_data.datasets[i].data.length; j++)
                            {
                                ks_temp_com = ks_temp_com + chart_data.datasets[i].data[j];
                                data.push(ks_temp_com);
                            }
                            datasets.label =  'Cumulative' + chart_data.datasets[i].label;
                            datasets.data = data;
                            if (item.ks_chart_cumulative){
                                datasets.type =  'line';
                            }
                            chart_data.datasets.push(datasets);
                    }
                }
            }
            var isDrill = item.isDrill ? item.isDrill : false;
            var chart_id = item.id,
                chart_title = item.name;
            var chart_title = item.name;
            var chart_type = item.ks_dashboard_item_type.split('_')[1];

            switch (chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    var chart_family = "square"
                    break;
                default:
                    var chart_family = "none";
                    break;
            }
            if (item.ks_data_calculation_type && item.ks_data_calculation_type === 'query') {
                var $ksChartContainer = $('<canvas id="ks_chart_canvas_id_query" data-chart-id=' + chart_id + '/>');
            } else {
                var $ksChartContainer = $('<canvas id="ks_chart_canvas_id" data-chart-id=' + chart_id + '/>');
            }

            $ks_gridstack_container.find('.card-body').append($ksChartContainer);

            item.$el = $ks_gridstack_container;
            if (chart_family === "circle") {
                if (chart_data && chart_data['labels'].length > 30) {
                    $ks_gridstack_container.find(".ks_dashboard_color_option").remove();
                    $ks_gridstack_container.find(".card-body").empty().append($("<div style='font-size:20px;'>Too many records for selected Chart Type. Consider using <strong>Domain</strong> to filter records or <strong>Record Limit</strong> to limit the no of records under <strong>30.</strong>"));
                    return;
                }
            }

            if (chart_data["ks_show_second_y_scale"] && item.ks_dashboard_item_type === 'ks_bar_chart') {
                var scales = {}
                scales.yAxes = [{
                        type: "linear",
                        display: true,
                        position: "left",
                        id: "y-axis-0",
                        gridLines: {
                            display: true
                        },
                        labels: {
                            show: true,
                        }
                    },
                    {
                        type: "linear",
                        display: true,
                        position: "right",
                        id: "y-axis-1",
                        labels: {
                            show: true,
                        },
                        ticks: {
                            beginAtZero: true,
                            callback: function(value, index, values) {
                                var ks_data = value;
                                var ks_selection = chart_data.ks_selection;
                                if (ks_selection === 'monetary') {
                                    var ks_currency_id = chart_data.ks_currency;

                                    ks_data = self._onKsGlobalFormatter(ks_data, item.ks_data_formatting, item.ks_precision_digits);
                                    ks_data = self.ks_monetary(ks_data, ks_currency,position);
                                   return ks_data;
                                } else if (ks_selection === 'custom') {
                                    var ks_field = chart_data.ks_field;
                                    return self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits) + ' ' + ks_field;
                                } else {
                                     return self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits);
                                }
                            },
                        }
                    }
                ]

            }
            var chart_plugin = [];
            if (item.ks_show_data_value) {
                chart_plugin.push(ChartDataLabels);
            }
            var ksMyChart = new Chart($ksChartContainer[0], {
                type: chart_type === "area" ? "line" : chart_type,
                plugins: chart_plugin,
                data: {
                    labels: chart_data['labels'],
                    groupByIds: chart_data['groupByIds'],
                    domains: chart_data['domains'],
                    datasets: chart_data.datasets,
                },
                options: {
                    maintainAspectRatio: false,
                    responsiveAnimationDuration: 1000,
                    animation: {
                        easing: 'easeInQuad',
                    },
                    legend: {
                            display: item.ks_hide_legend
                        },
                    scales: scales,
                    layout: {
                        padding: {
                            bottom: 0,
                        }
                    },
                    plugins: {
                        datalabels: {
                            backgroundColor: function(context) {
                                return context.dataset.backgroundColor;
                            },
                            borderRadius: 4,
                            color: 'white',
                            font: {
                                weight: 'bold'
                            },
                            anchor: 'center',
                            textAlign: 'center',
                            display: 'auto',
                            clamp: true,
                            formatter: function(value, ctx) {
                                let sum = 0;
                                let dataArr = ctx.dataset.data;
                                dataArr.map(data => {
                                    sum += data;
                                });
                                let percentage = sum === 0 ? 0 + "%" : (value * 100 / sum).toFixed(2) + "%";
                                return percentage;
                            },
                        },
                    },
                }
            });

            this.chart_container[chart_id] = ksMyChart;
            if (chart_data && chart_data["datasets"].length > 0) self.ksChartColors(item.ks_chart_item_color, ksMyChart, chart_type, chart_family, item.ks_bar_chart_stacked, item.ks_semi_circle_chart, item.ks_show_data_value, chart_data, ks_currency, position, item);
        },

        ksChartColors: function(palette, ksMyChart, ksChartType, ksChartFamily, stack, semi_circle, ks_show_data_value, chart_data, ks_currency, position, item) {
            var ks_self = this;
            var currentPalette = "cool";
            if (!palette) palette = currentPalette;
            currentPalette = palette;

            /*Gradients
              The keys are percentage and the values are the color in a rgba format.
              You can have as many "color stops" (%) as you like.
              0% and 100% is not optional.*/
            var gradient;
            switch (palette) {
                case 'cool':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [220, 237, 200, 1],
                        45: [66, 179, 213, 1],
                        65: [26, 39, 62, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'warm':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [254, 235, 101, 1],
                        45: [228, 82, 27, 1],
                        65: [77, 52, 47, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'neon':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [255, 236, 179, 1],
                        45: [232, 82, 133, 1],
                        65: [106, 27, 154, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;

                case 'default':
                    var color_set = ['#F04F65', '#f69032', '#fdc233', '#53cfce', '#36a2ec', '#8a79fd', '#b1b5be', '#1c425c', '#8c2620', '#71ecef', '#0b4295', '#f2e6ce', '#1379e7']
            }

            //Find datasets and length
            var chartType = ksMyChart.config.type;
            switch (chartType) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var datasets = ksMyChart.config.data.datasets[0];
                    var setsCount = datasets.data.length;
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                    var datasets = ksMyChart.config.data.datasets;
                    var setsCount = datasets.length;
                    break;
            }

            //Calculate colors
            var chartColors = [];

            if (palette !== "default") {
                //Get a sorted array of the gradient keys
                var gradientKeys = Object.keys(gradient);
                gradientKeys.sort(function(a, b) {
                    return +a - +b;
                });
                for (var i = 0; i < setsCount; i++) {
                    var gradientIndex = (i + 1) * (100 / (setsCount + 1)); //Find where to get a color from the gradient
                    for (var j = 0; j < gradientKeys.length; j++) {
                        var gradientKey = gradientKeys[j];
                        if (gradientIndex === +gradientKey) { //Exact match with a gradient key - just get that color
                            chartColors[i] = 'rgba(' + gradient[gradientKey].toString() + ')';
                            break;
                        } else if (gradientIndex < +gradientKey) { //It's somewhere between this gradient key and the previous
                            var prevKey = gradientKeys[j - 1];
                            var gradientPartIndex = (gradientIndex - prevKey) / (gradientKey - prevKey); //Calculate where
                            var color = [];
                            for (var k = 0; k < 4; k++) { //Loop through Red, Green, Blue and Alpha and calculate the correct color and opacity
                                color[k] = gradient[prevKey][k] - ((gradient[prevKey][k] - gradient[gradientKey][k]) * gradientPartIndex);
                                if (k < 3) color[k] = Math.round(color[k]);
                            }
                            chartColors[i] = 'rgba(' + color.toString() + ')';
                            break;
                        }
                    }
                }
            } else {
                for (var i = 0, counter = 0; i < setsCount; i++, counter++) {
                    if (counter >= color_set.length) counter = 0; // reset back to the beginning

                    chartColors.push(color_set[counter]);
                }

            }

            var datasets = ksMyChart.config.data.datasets;
            var options = ksMyChart.config.options;

            options.legend.labels.usePointStyle = true;
            if (ksChartFamily == "circle") {
                if (ks_show_data_value) {
                    options.legend.position = 'bottom';
                    options.layout.padding.top = 10;
                    options.layout.padding.bottom = 20;
                    options.layout.padding.left = 20;
                    options.layout.padding.right = 20;
                } else {
                    options.legend.position = 'top';
                }

                options.plugins.datalabels.align = 'center';
                options.plugins.datalabels.anchor = 'end';
                options.plugins.datalabels.borderColor = 'white';
                options.plugins.datalabels.borderRadius = 25;
                options.plugins.datalabels.borderWidth = 2;
                options.plugins.datalabels.clamp = true;
                options.plugins.datalabels.clip = false;

                options.tooltips.callbacks = {
                    title: function(tooltipItem, data) {
//                        var ks_self = ks_self;
                        var k_amount = data.datasets[tooltipItem[0].datasetIndex]['data'][tooltipItem[0].index];
                        var ks_selection = chart_data.ks_selection;
                        if (ks_selection === 'monetary') {
                            var ks_currency_id = chart_data.ks_currency;
                            k_amount = ks_self.ks_monetary(k_amount, ks_currency, position);
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount
                        } else if (ks_selection === 'custom') {
                            var ks_field = chart_data.ks_field;
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount + " " + ks_field;
                        } else {
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount
                        }
                    },
                    label: function(tooltipItem, data) {
                        return data.labels[tooltipItem.index];
                    },
                }
                for (var i = 0; i < datasets.length; i++) {
                    datasets[i].backgroundColor = chartColors;
                    datasets[i].borderColor = "rgba(255,255,255,1)";
                }
                if (semi_circle && (chartType === "pie" || chartType === "doughnut")) {
                    options.rotation = 1 * Math.PI;
                    options.circumference = 1 * Math.PI;
                }
            } else if (ksChartFamily == "square") {
                options.scales.xAxes[0].gridLines.display = false;
                options.scales.yAxes[0].ticks.beginAtZero = true;

                options.plugins.datalabels.align = 'end';

                options.plugins.datalabels.formatter = function(value, ctx) {
                    var ks_selection = chart_data.ks_selection;
                    var ks_data = value;
                    if (ks_selection === 'monetary') {
                        var ks_currency_id = chart_data.ks_currency;
                        ks_data = ks_self._onKsGlobalFormatter(ks_data, item.ks_data_formatting, item.ks_precision_digits);
                        ks_data = ks_self.ks_monetary(ks_data, ks_currency,position);
                       return ks_data;
                    } else if (ks_selection === 'custom') {
                        var ks_field = chart_data.ks_field;
                        return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits) + ' ' + ks_field;
                    } else {
                         return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits);
                    }
                };

                if (chartType === "line") {
                    options.plugins.datalabels.backgroundColor = function(context) {
                        return context.dataset.borderColor;
                    };
                }

                if (chartType === "horizontalBar") {
                    options.scales.xAxes[0].ticks.callback = function(value, index, values) {
                    var ks_selection = chart_data.ks_selection;
                    var ks_data = value;
                    if (ks_selection === 'monetary') {
                        var ks_currency_id = chart_data.ks_currency;
                        ks_data = ks_self._onKsGlobalFormatter(ks_data, item.ks_data_formatting, item.ks_precision_digits);
                        ks_data = ks_self.ks_monetary(ks_data, ks_currency,position);
                       return ks_data;
                    } else if (ks_selection === 'custom') {
                        var ks_field = chart_data.ks_field;
                        return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits) + ' ' + ks_field;
                    } else {
                         return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits);
                    }
                    }
                    options.scales.xAxes[0].ticks.beginAtZero = true;
                } else {
                    options.scales.yAxes[0].ticks.callback = function(value, index, values) {
                        var ks_selection = chart_data.ks_selection;
                        var ks_data = value;
                        if (ks_selection === 'monetary') {
                        var ks_currency_id = chart_data.ks_currency;
                        ks_data = ks_self._onKsGlobalFormatter(ks_data, item.ks_data_formatting, item.ks_precision_digits);
                        ks_data = ks_self.ks_monetary(ks_data, ks_currency,position);
                       return ks_data;
                    } else if (ks_selection === 'custom') {
                        var ks_field = chart_data.ks_field;
                        return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits) + ' ' + ks_field;
                    } else {
                         return ks_self._onKsGlobalFormatter(value, item.ks_data_formatting, item.ks_precision_digits);
                    }
                    }
                }

                options.tooltips.callbacks = {
                    label: function(tooltipItem, data) {
//                        var ks_self = self;
                        var k_amount = data.datasets[tooltipItem.datasetIndex]['data'][tooltipItem.index];
                        var ks_selection = chart_data.ks_selection;
                        if (ks_selection === 'monetary') {
                            var ks_currency_id = chart_data.ks_currency;
                            k_amount = ks_self.ks_monetary(k_amount, ks_currency, position);
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount
                        } else if (ks_selection === 'custom') {
                            var ks_field = chart_data.ks_field;
                            // ks_type = field_utils.format.char(ks_field);
//                            k_amount = field_utils.format.float(k_amount, Float64Array);
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount + " " + ks_field;
                        } else {
//                            k_amount = field_utils.format.float(k_amount, Float64Array);
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount
                        }
                    }
                }

                for (var i = 0; i < datasets.length; i++) {
                    switch (ksChartType) {
                        case "bar":
                        case "horizontalBar":
                            if (datasets[i].type && datasets[i].type == "line") {
                                datasets[i].borderColor = chartColors[i];
                                datasets[i].backgroundColor = "rgba(255,255,255,0)";
                                datasets[i]['datalabels'] = {
                                    backgroundColor: chartColors[i],
                                }
                            } else {
                                datasets[i].backgroundColor = chartColors[i];
                                datasets[i].borderColor = "rgba(255,255,255,0)";
                                options.scales.xAxes[0].stacked = stack;
                                options.scales.yAxes[0].stacked = stack;
                            }
                            break;
                        case "line":
                            datasets[i].borderColor = chartColors[i];
                            datasets[i].backgroundColor = "rgba(255,255,255,0)";
                            break;
                        case "area":
                            datasets[i].borderColor = chartColors[i];
                            break;
                    }
                }
            }
            ksMyChart.update();
        },

        _renderDateFilterDatePicker: function() {
            var ks_self = this;
            //Show Print option cause items are present.
            ks_self.$el.find(".ks_dashboard_link").removeClass("ks_hide");
            if ($('#ks_date_filter_selection', this.$el) == 'l_custom') {
                ks_self.$el.find('.ks_date_input_fields', this.$el).append('<input type="text" class="ks_wdn_start_date_picker" placeholder="Start Date"></input>')
                ks_self.$el.find('.ks_date_input_fields', this.$el).append('<input type="text" class="ks_wdn_end_date_picker" placeholder="End Date"></input>')
            } else {
                ks_self.$el.find('.ks_date_input_fields', this.$el).append('<input type="text" class="ks_wdn_start_date_picker" placeholder="Start Date"></input>')
                ks_self.$el.find('.ks_date_input_fields', this.$el).append('<input type="text" class="ks_wdn_end_date_picker" placeholder="End Date"></input>')
            }
            ks_self.$el.find(".ks_wdn_start_date_picker", ks_self.$el).datepicker({
                dateFormat: "yy/mm/dd",
                altFormat: "yy-mm-dd",
                altField: "#ksActualStartDateToStore",
                changeMonth: true,
                changeYear: true,
                language: moment.locale('en'),
                onSelect: function(ks_start_date) {
                    ks_self.$el.find(".ks_wdn_start_date_picker").val(moment(new Date(ks_start_date)).format(ks_self.datetime_format));
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                },
            });

            ks_self.$el.find(".ks_wdn_end_date_picker", ks_self.$el).datepicker({
                dateFormat: "yy/mm/dd",
                altFormat: "yy-mm-dd",
                altField: "#ksActualEndDateToStore",
                changeMonth: true,
                changeYear: true,
                language: moment.locale(),
                onSelect: function(ks_end_date) {
                    ks_self.$el.find(".ks_wdn_end_date_picker").val(moment(new Date(ks_end_date)).format(ks_self.datetime_format));
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                },
            });
            ks_self._KsGetDateValues();
        },

        ks_set_update_interval: function() {
            var self = this;

            if (self.config.ks_item_data) {
                Object.keys(self.config.ks_item_data).forEach(function(item_id) {
                    var item_data = self.config.ks_item_data[item_id]
                    var updateValue = item_data["ks_update_items_data"];
                    if (updateValue) {
                        if (!(item_id in self.ksUpdateDashboard)) {
                            if (['ks_tile', 'ks_list_view', 'ks_kpi', 'ks_to_do'].indexOf(item_data['ks_dashboard_item_type']) >= 0) {
                                var ksItemUpdateInterval = setInterval(function() {
                                    self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                            } else {
                                var ksItemUpdateInterval = setInterval(function() {
                                    self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                            }
                            self.ksUpdateDashboard[item_id] = ksItemUpdateInterval;
                        }
                    }
                });
            }
        },

        ks_remove_update_interval: function() {
            var self = this;
            if (self.ksUpdateDashboard) {
                Object.values(self.ksUpdateDashboard).forEach(function(itemInterval) {
                    clearInterval(itemInterval);
                });
            }
        },

        _KsGetDateValues: function() {
            var self = this;

            //Setting Date Filter Selected Option in Date Filter DropDown Menu
            var date_filter_selected = self.config.ks_date_filter_selection;
            if (self.ksDateFilterSelection == 'l_none'){
                    var date_filter_selected = self.ksDateFilterSelection;
            }
            self.$el.find('#' + date_filter_selected).addClass("ks_date_filter_selected");
            self.$el.find('#ks_date_filter_selection').text(self.ks_date_filter_selections[date_filter_selected]);

            if (self.config.ks_date_filter_selection === 'l_custom') {
                var ks_end_date = self.config.ks_dashboard_end_date;
                var ks_start_date = self.config.ks_dashboard_start_date;

                self.$el.find(".ks_wdn_start_date_picker").val(moment.utc(ks_start_date).local().format(self.datetime_format));
                self.$el.find(".ks_wdn_end_date_picker").val(moment.utc(ks_end_date).local().format(self.datetime_format));
                self.$el.find('.ks_date_input_fields').removeClass("ks_hide");
                self.$el.find('.ks_date_filter_dropdown').addClass("ks_btn_first_child_radius");
            } else if (self.config.ks_date_filter_selection !== 'l_custom') {
                self.$el.find('.ks_date_input_fields').addClass("ks_hide");
            }
        },

        ks_get_dark_color: function(color, opacity, percent) {
            var num = parseInt(color.slice(1), 16),
                amt = Math.round(2.55 * percent),
                R = (num >> 16) + amt,
                G = (num >> 8 & 0x00FF) + amt,
                B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1) + "," + opacity;
        },

        _ksRenderDashboardTile: function(tile) {

            var ks_self = this;
            var ks_container_class = 'grid-stack-item',
            ks_inner_container_class = 'grid-stack-item-content';
            var ks_icon_url, item_view;
            var ks_rgba_background_color, ks_rgba_font_color, ks_rgba_default_icon_color;
            var style_main_body, style_image_body_l2, style_domain_count_body, style_button_customize_body,
                style_button_delete_body;

            var data_count = ks_self.ksNumFormatter(tile.ks_record_count, 1);
            if (tile.ks_icon_select == "Custom") {
                if (tile.ks_icon[0]) {
                    ks_icon_url = 'data:image/' + (ks_self.file_type_magic_word[tile.ks_icon[0]] || 'png') + ';base64,' + tile.ks_icon;
                } else {
                    ks_icon_url = false;
                }
            }
            if (tile.ks_multiplier_active){
                var ks_record_count = tile.ks_record_count * tile.ks_multiplier
                var data_count = ks_self._onKsGlobalFormatter(ks_record_count, tile.ks_data_formatting, tile.ks_precision_digits);
                var count = ks_record_count;
            }else{
                 var data_count = ks_self._onKsGlobalFormatter(tile.ks_record_count, tile.ks_data_formatting, tile.ks_precision_digits);
                 var count = ks_record_count;
            }


            tile.ksIsDashboardManager = ks_self.config.ks_dashboard_manager;
            ks_rgba_background_color = ks_self._ks_get_rgba_format(tile.ks_background_color);
            ks_rgba_font_color = ks_self._ks_get_rgba_format(tile.ks_font_color);
            ks_rgba_default_icon_color = ks_self._ks_get_rgba_format(tile.ks_default_icon_color);
            style_main_body = "background-color:" + ks_rgba_background_color + ";color : " + ks_rgba_font_color + ";";
            switch (tile.ks_layout) {
                case 'layout1':
                    item_view = QWeb.render('ks_dashboard_item_layout1', {
                        item: tile,
                        style_main_body: style_main_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count
                    });
                    break;

                case 'layout2':
                    var ks_rgba_dark_background_color_l2 = ks_self._ks_get_rgba_format(ks_self.ks_get_dark_color(tile.ks_background_color.split(',')[0], tile.ks_background_color.split(',')[1], -10));
                    style_image_body_l2 = "background-color:" + ks_rgba_dark_background_color_l2 + ";";
                    item_view = QWeb.render('ks_dashboard_item_layout2', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout3':
                    item_view = QWeb.render('ks_dashboard_item_layout3', {
                        item: tile,
                        style_main_body: style_main_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout4':
                    style_main_body = "color : " + ks_rgba_font_color + ";border : solid;border-width : 1px;border-color:" + ks_rgba_background_color + ";"
                    style_image_body_l2 = "background-color:" + ks_rgba_background_color + ";";
                    style_domain_count_body = "color:" + ks_rgba_background_color + ";";
                    item_view = QWeb.render('ks_dashboard_item_layout4', {
                        item: tile,
                        style_main_body: style_main_body,
                        style_image_body_l2: style_image_body_l2,
                        style_domain_count_body: style_domain_count_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout5':
                    item_view = QWeb.render('ks_dashboard_item_layout5', {
                        item: tile,
                        style_main_body: style_main_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout6':
                    ks_rgba_default_icon_color = ks_self._ks_get_rgba_format(tile.ks_default_icon_color);
                    item_view = QWeb.render('ks_dashboard_item_layout6', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        ks_icon_url: ks_icon_url,
                        ks_rgba_default_icon_color: ks_rgba_default_icon_color,
                        ks_container_class: ks_container_class,
                        ks_inner_container_class: ks_inner_container_class,
                        ks_dashboard_list: ks_self.config.ks_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                default:
                    item_view = QWeb.render('ks_dashboard_item_layout_default', {
                        item: tile
                    });
                    break;
            }

            return item_view
        },


        ksSum: function(count_1, count_2, item_info, field, target_1, $kpi_preview, kpi_data) {
            var self = this;
            var count = count_1 + count_2;
            if (field.ks_multiplier_active){
                item_info['count'] = self._onKsGlobalFormatter(count* field.ks_multiplier, field.ks_data_formatting, field.ks_precision_digits);
                item_info['count_tooltip'] = count * field.ks_multiplier;
            }else{

                item_info['count'] = self._onKsGlobalFormatter(count, field.ks_data_formatting, field.ks_precision_digits);
                item_info['count_tooltip'] = count;
            }
             if (field.ks_multiplier_active){
                count = count * field.ks_multiplier;
            }
            item_info['target_enable'] = field.ks_goal_enable;
            var ks_color = (target_1 - count) > 0 ? "red" : "green";
            item_info.pre_arrow = (target_1 - count) > 0 ? "down" : "up";
            item_info['ks_comparison'] = true;
            var target_deviation = (target_1 - count) > 0 ? Math.round(((target_1 - count) / target_1) * 100) : Math.round((Math.abs((target_1 - count)) / target_1) * 100);
            if (target_deviation !== Infinity) item_info.target_deviation = self.ksFormatValue(target_deviation, 'init', field.ks_precision_digits) + "%";
            else {
                item_info.target_deviation = target_deviation;
                item_info.pre_arrow = false;
            }
            var target_progress_deviation = target_1 == 0 ? 0 : Math.round((count / target_1) * 100);
            item_info.target_progress_deviation = self.ksFormatValue(target_progress_deviation,'init', field.ks_precision_digits) + "%";
            $kpi_preview = $(QWeb.render("ks_kpi_template_2", item_info));
            $kpi_preview.find('.target_deviation').css({
                "color": ks_color
            });
            if (field.ks_target_view === "Progress Bar") {
                $kpi_preview.find('#ks_progressbar').val(target_progress_deviation)
            }

            return $kpi_preview;
        },

        ksPercentage: function(count_1, count_2, field, item_info, target_1, $kpi_preview, kpi_data) {

            if (field.ks_multiplier_active){
                count_1 = count_1 * field.ks_multiplier;
                count_2 = count_2 * field.ks_multiplier;
            }
            var count = parseInt((count_1 / count_2) * 100);
            item_info['count'] = count ? count + "%" : "0%";
            item_info['count_tooltip'] = count ? count + "%" : "0%";
            item_info.target_progress_deviation = item_info['count']
            target_1 = target_1 > 100 ? 100 : target_1;
            item_info.target = target_1 + "%";
            item_info.pre_arrow = (target_1 - count) > 0 ? "down" : "up";
            var ks_color = (target_1 - count) > 0 ? "red" : "green";
            item_info['target_enable'] = field.ks_goal_enable;
            item_info['ks_comparison'] = false;
            item_info.target_deviation = item_info.target > 100 ? 100 : item_info.target;
            $kpi_preview = $(QWeb.render("ks_kpi_template_2", item_info));
            $kpi_preview.find('.target_deviation').css({
                "color": ks_color
            });
            if (field.ks_target_view === "Progress Bar") {
                if (count) $kpi_preview.find('#ks_progressbar').val(count);
                else $kpi_preview.find('#ks_progressbar').val(0);
            }

            return $kpi_preview;
        },

        renderKpi: function(item) {
            var ks_self = this;
            var field = item;
            var ks_date_filter_selection = field.ks_date_filter_selection;
            if (field.ks_date_filter_selection === "l_none") ks_date_filter_selection = ks_self.config.ks_date_filter_selection;
            var ks_valid_date_selection = ['l_day', 't_week', 't_month', 't_quarter', 't_year'];
            var kpi_data = JSON.parse(field.ks_kpi_data);
            var count_1 = kpi_data[0].record_data;
            var count_2 = kpi_data[1] ? kpi_data[1].record_data : undefined;
            var target_1 = kpi_data[0].target;
            var target_view = field.ks_target_view,
                pre_view = field.ks_prev_view;
            var ks_rgba_background_color = ks_self._ks_get_rgba_format(field.ks_background_color);
            var ks_rgba_font_color = ks_self._ks_get_rgba_format(field.ks_font_color)

            if (field.ks_goal_enable) {
                var diffrence = 0.0
               if(field.ks_multiplier_active){
                    diffrence = (count_1 * field.ks_multiplier) - target_1
                }else{
                    diffrence = count_1 - target_1
                }
                var acheive = diffrence >= 0 ? true : false;
                diffrence = Math.abs(diffrence);
                var deviation = Math.round((diffrence / target_1) * 100)
                if (deviation !== Infinity) deviation = deviation ? ks_self.ksFormatValue(deviation, 'init',2) + '%' : 0 + '%';
            }

            if (field.ks_previous_period && ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0) {
                var previous_period_data = kpi_data[0].previous_period;
                var pre_diffrence = (count_1 - previous_period_data);
                if (field.ks_multiplier_active){
                    var previous_period_data = kpi_data[0].previous_period * field.ks_multiplier;
                    var pre_diffrence = (count_1 * field.ks_multiplier   - previous_period_data);
                }
                var pre_acheive = pre_diffrence > 0 ? true : false;
                pre_diffrence = Math.abs(pre_diffrence);
                var pre_deviation = previous_period_data ? ks_self.ksFormatValue(parseInt((pre_diffrence / previous_period_data) * 100),'init',2) + '%' : "100%"
            }
            var item = {
                ksIsDashboardManager: ks_self.config.ks_dashboard_manager,
                id: field.id,
            }
            var ks_icon_url;
            if (field.ks_icon_select == "Custom") {
                if (field.ks_icon[0]) {
                    ks_icon_url = 'data:image/' + (ks_self.file_type_magic_word[field.ks_icon[0]] || 'png') + ';base64,' + field.ks_icon;
                } else {
                    ks_icon_url = false;
                }
            }
            var target_progress_deviation = String(Math.round((count_1  / target_1) * 100));
             if(field.ks_multiplier_active){
                var target_progress_deviation = String(Math.round(((count_1 * field.ks_multiplier) / target_1) * 100));
             }
            var ks_rgba_icon_color = ks_self._ks_get_rgba_format(field.ks_default_icon_color)
            var item_info = {
                item: item,
                id: field.id,
                count_1: ks_self.ksNumFormatter(kpi_data[0]['record_data'], 1),
                count_1_tooltip: kpi_data[0]['record_data'],
                count_2: kpi_data[1] ? String(kpi_data[1]['record_data']) : false,
                name: field.name ? field.name : field.ks_model_id.data.display_name,
                target_progress_deviation: target_progress_deviation,
                icon_select: field.ks_icon_select,
                default_icon: field.ks_default_icon,
                icon_color: ks_rgba_icon_color,
                target_deviation: deviation,
                target_arrow: acheive ? 'up' : 'down',
                ks_enable_goal: field.ks_goal_enable,
                ks_previous_period: ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0 ? field.ks_previous_period : false,
                target: ks_self.ksNumFormatter(target_1, 1),
                previous_period_data: previous_period_data,
                pre_deviation: pre_deviation,
                pre_arrow: pre_acheive ? 'up' : 'down',
                target_view: field.ks_target_view,
                pre_view: field.ks_prev_view,
                ks_dashboard_list: ks_self.config.ks_dashboard_list,
                ks_icon_url: ks_icon_url,
            }

            if (item_info.target_deviation === Infinity) item_info.target_arrow = false;
            item_info.target_progress_deviation = parseInt(item_info.target_progress_deviation) ? ks_self.ksFormatValue(parseInt(item_info.target_progress_deviation), 'init', field.ks_precision_digits) : "0"
            if (field.ks_multiplier_active){
                item_info['count_1'] = ks_self._onKsGlobalFormatter(kpi_data[0]['record_data'] * field.ks_multiplier, field.ks_data_formatting, field.ks_precision_digits);
                item_info['count_1_tooltip'] = kpi_data[0]['record_data'] * field.ks_multiplier
            }else{
                item_info['count_1'] = ks_self._onKsGlobalFormatter(kpi_data[0]['record_data'], field.ks_data_formatting, field.ks_precision_digits);
            }
            item_info['target'] = ks_self._onKsGlobalFormatter(kpi_data[0].target, field.ks_data_formatting, field.ks_precision_digits);

            var $kpi_preview;
            if (!kpi_data[1]) {
                if (field.ks_target_view === "Number" || !field.ks_goal_enable) {
                    $kpi_preview = $(QWeb.render("ks_kpi_template", item_info));
                } else if (field.ks_target_view === "Progress Bar" && field.ks_goal_enable) {
                    $kpi_preview = $(QWeb.render("ks_kpi_template_3", item_info));
                    $kpi_preview.find('#ks_progressbar').val(parseInt(item_info.target_progress_deviation));

                }

                if (field.ks_goal_enable) {
                    if (acheive) {
                        $kpi_preview.find(".target_deviation").css({
                            "color": "green",
                        });
                    } else {
                        $kpi_preview.find(".target_deviation").css({
                            "color": "red",
                        });
                    }
                }
                if (field.ks_previous_period && String(previous_period_data) && ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0) {
                    if (pre_acheive) {
                        $kpi_preview.find(".pre_deviation").css({
                            "color": "green",
                        });
                    } else {
                        $kpi_preview.find(".pre_deviation").css({
                            "color": "red",
                        });
                    }
                }
                if ($kpi_preview.find('.ks_target_previous').children().length !== 2) {
                    $kpi_preview.find('.ks_target_previous').addClass('justify-content-center');
                }
            } else {
                switch (field.ks_data_comparison) {
                    case "None":
                        if (field.ks_multiplier_active){
                            var count_tooltip = String(count_1 * field.ks_multiplier) + "/" + String(count_2 * field.ks_multiplier);
                            var count = String(ks_self.ksNumFormatter(count_1 * field.ks_multiplier, 1)) + "/" + String(ks_self.ksNumFormatter(count_2 * field.ks_multiplier, 1));
                            item_info['count'] = String(ks_self._onKsGlobalFormatter(count_1 * field.ks_multiplier, field.ks_data_formatting, field.ks_precision_digits)) + "/" + String(ks_self._onKsGlobalFormatter(count_2 * field.ks_multiplier, field.ks_data_formatting, field.ks_precision_digits));
                         }else{
                            var count_tooltip = String(count_1) + "/" + String(count_2);
                            var count = String(ks_self.ksNumFormatter(count_1, 1)) + "/" + String(ks_self.ksNumFormatter(count_2, 1));
                            item_info['count'] = String(ks_self._onKsGlobalFormatter(count_1, field.ks_data_formatting, field.ks_precision_digits)) + "/" + String(ks_self._onKsGlobalFormatter(count_2, field.ks_data_formatting, field.ks_precision_digits));
                         }
                        item_info['count_tooltip'] = count_tooltip;
                        item_info['target_enable'] = false;
                        $kpi_preview = $(QWeb.render("ks_kpi_template_2", item_info));
                        break;
                    case "Sum":
                        $kpi_preview = ks_self.ksSum(count_1, count_2, item_info, field, target_1, $kpi_preview, kpi_data);
                        break;
                    case "Percentage":
                        $kpi_preview = ks_self.ksPercentage(count_1, count_2, field, item_info, target_1, $kpi_preview, kpi_data)
                        break;
                    case "Ratio":
                        var gcd = ks_self.ks_get_gcd(Math.round(count_1), Math.round(count_2));
                        if (field.ks_data_formatting == 'exact'){
                            if (count_1 && count_2) {
                            item_info['count_tooltip'] = count_1 / gcd + ":" + count_2 / gcd;
                            item_info['count'] = ks_self.ksFormatValue(count_1 / gcd, 'float', field.ks_precision_digits) + ":" + ks_self.ksFormatValue(count_2 / gcd, 'float', field.ks_precision_digits);;
                            } else {
                            item_info['count_tooltip'] = count_1 + ":" + count_2;
                            item_info['count'] = count_1 + ":" + count_2
                                   }
                          }else{
                            if (count_1 && count_2) {
                            item_info['count_tooltip'] = count_1 / gcd + ":" + count_2 / gcd;
                            item_info['count'] = ks_self.ksNumFormatter(count_1 / gcd, 1) + ":" + ks_self.ksNumFormatter(count_2 / gcd, 1);
                            }else {
                            item_info['count_tooltip'] = (count_1) + ":" + count_2;
                            item_info['count'] = ks_self.ksNumFormatter(count_1, 1) + ":" + ks_self.ksNumFormatter(count_2, 1);
                                  }
                          }
                        item_info['target_enable'] = false;
                        $kpi_preview = $(QWeb.render("ks_kpi_template_2", item_info));
                        break;
                }
            }
            $kpi_preview.find('.ks_dashboarditem_id').css({
                "background-color": ks_rgba_background_color,
                "color": ks_rgba_font_color,
            });

            return $kpi_preview
        },

        ks_get_gcd: function(a, b) {
            return (b == 0) ? a : this.ks_get_gcd(b, a % b);
        },

        _renderListView: function(item, grid) {
            var ks_self = this;
            var list_view_data = JSON.parse(item.ks_list_view_data);
            var item_id = item.id,
                pager = true ,
                data_rows = list_view_data.data_rows,
                length = data_rows ? data_rows.length : false,
                item_title = item.name;
            if (item.ks_data_calculation_type && item.ks_data_calculation_type === 'query') {
                pager = false;
            }
            var $ksItemContainer = ks_self._renderListViewData(item)
            var $ks_gridstack_container = $(QWeb.render('ks_gridstack_list_view_container', {
                ks_chart_title: item_title,
                ksIsDashboardManager: ks_self.config.ks_dashboard_manager,
                ks_dashboard_list: ks_self.config.ks_dashboard_list,
                item_id: item_id,
                count: '1-' + length,
                offset: 1,
                intial_count: length,
                ks_pager: pager,
            })).addClass('ks_dashboarditem_id');
//            $ks_gridstack_container.find('.ks_pager').addClass('d-none')
            if (item.ks_pagination_limit < length  ) {
                $ks_gridstack_container.find('.ks_load_next').addClass('ks_event_offer_list');
            }
            if (length < item.ks_pagination_limit ) {
                $ks_gridstack_container.find('.ks_load_next').addClass('ks_event_offer_list');
            }
            if (item.ks_record_data_limit === item.ks_pagination_limit){
                   $ks_gridstack_container.find('.ks_load_next').addClass('ks_event_offer_list');
            }
            if (length == 0){
                $ks_gridstack_container.find('.ks_pager').addClass('d-none');
            }
           if (item.ks_pagination_limit == 0){
                $ks_gridstack_container.find('.ks_pager_name').addClass('d-none');
           }

            $ks_gridstack_container.find('.card-body').append($ksItemContainer);

            item.$el = $ks_gridstack_container;
            if (item_id in ks_self.gridstackConfig) {
                grid.addWidget($ks_gridstack_container[0], {x:ks_self.gridstackConfig[item_id].x, y:ks_self.gridstackConfig[item_id].y, w:ks_self.gridstackConfig[item_id].w, h:ks_self.gridstackConfig[item_id].h, autoPosition:false, minW:3, maxW:null, minH:3, maxH:null, id:item_id});
            } else {
                grid.addWidget($ks_gridstack_container[0], {x:0, y:0, w:5, h:4, autoPosition:true, minW:3, maxW:null, minH:3, maxH:null, id:item_id});
            }
        },

        _renderListViewData: function(item) {
            var ks_self = this;
            var list_view_data = JSON.parse(item.ks_list_view_data);
            var item_id = item.id,
                data_rows = list_view_data.data_rows,
                item_title = item.name;
            if (item.ks_list_view_type === "ungrouped" && list_view_data) {
                if (list_view_data.date_index) {
                    var index_data = list_view_data.date_index;
                    for (var i = 0; i < index_data.length; i++) {
                        for (var j = 0; j < list_view_data.data_rows.length; j++) {
                            var index = index_data[i]
                            var index = index_data[i]
                            var date = list_view_data.data_rows[j]["data"][index]
                            if (date) {
                                if (list_view_data.fields_type[index] === 'date'){
                                    list_view_data.data_rows[j]["data"][index] = moment(new Date(date+" UTC")).format(this.date_format) , {}, {timezone: false};
                                }else{
                                    list_view_data.data_rows[j]["data"][index] = moment(new Date(date+" UTC")).format(this.datetime_format), {}, {timezone: false};
                                }
                            }else{
                                list_view_data.data_rows[j]["data"][index] = "";
                            }
                        }
                    }
                }
            }
            if (list_view_data) {
                for (var i = 0; i < list_view_data.data_rows.length; i++) {
                    for (var j = 0; j < list_view_data.data_rows[0]["data"].length; j++) {
                        if (typeof(data_rows[i].data[j]) === "number" || list_view_data.data_rows[i].data[j]) {
                            if (typeof(list_view_data.data_rows[i].data[j]) === "number"){
                                list_view_data.data_rows[i].data[j] = ks_self.ksFormatValue(data_rows[i].data[j], 'float',item.ks_precision_digits);
                        }
                        }else {
                            list_view_data.data_rows[i].data[j] = "";
                        }
                    }
                }
            }
            var ks_data_calculation_type = ks_self.config.ks_item_data[item_id].ks_data_calculation_type
            var $ksItemContainer = $(QWeb.render('ks_list_view_table', {
                list_view_data: list_view_data,
                item_id: item_id,
                list_type: item.ks_list_view_type,
                calculation_type: ks_data_calculation_type,
                isDrill: ks_self.config.ks_item_data[item_id]['isDrill']
            }));
            ks_self.list_container = $ksItemContainer;
            if (list_view_data){
                var $ksitemBody = ks_self.ksListViewBody(list_view_data,item_id)
                ks_self.list_container.find('.ks_table_body').append($ksitemBody)
            }
            if (item.ks_list_view_type === "ungrouped") {
                $ksItemContainer.find('.ks_list_canvas_click').removeClass('ks_list_canvas_click');
            }

            $ksItemContainer.find('#ks_item_info').hide();


            return $ksItemContainer
        },

        ksListViewBody: function(list_view_data, item_id) {
            var self = this;
            var itemid = item_id
            var  ks_data_calculation_type = self.config.ks_item_data[item_id].ks_data_calculation_type
            var $ksitemBody = $(QWeb.render('ks_list_view_tmpl', {
                        list_view_data: list_view_data,
                        item_id: itemid,
                        calculation_type: ks_data_calculation_type,
                        isDrill: self.config.ks_item_data[item_id]['isDrill']
                    }));
            return $ksitemBody;

        },


        stop: function() {
            this.widget.destroy();
        },

        ksFetchUpdateItem: function(id) {
            var ks_self = this;
            var item_data = ks_self.config.ks_item_data[id];
            var params = ks_self.ksGetParamsForItemFetch(parseInt(item_data.id));
            return ajax.jsonRpc('/fetch/item/update', 'call', {
                model: 'ks_dashboard_ninja.board',
                method: 'ks_fetch_item_controller',
                args: [],
                kwargs: {
                    'item_id': [item_data.id],
                    'dashboard': item_data.ks_dashboard_id,
                    'type': ks_self.data_selection,
                    'params': params
                },
                context: ks_self.getContext(),
            }).then(function(new_item_data) {
                this.config.ks_item_data[item_data.id] = new_item_data[item_data.id];
                this.ksUpdateDashboardItem([item_data.id]);
            }.bind(this));
        },

        onChartCanvasClick: function(evt) {
            var ks_self = this;
            if (evt.currentTarget.classList.value !== 'ks_list_canvas_click') {
                var item_id = evt.currentTarget.dataset.chartId;
                if (item_id in ks_self.ksUpdateDashboard) {
                    clearInterval(ks_self.ksUpdateDashboard[item_id])
                    delete ks_self.ksUpdateDashboard[item_id];
                }
                var myChart = ks_self.chart_container[item_id];
                var activePoint = myChart.getElementAtEvent(evt)[0];
                if (activePoint) {
                    var item_data = ks_self.config.ks_item_data[item_id];
                    var groupBy = item_data.ks_chart_groupby_type === 'relational_type' ? item_data.ks_chart_relation_groupby_name : item_data.ks_chart_relation_groupby_name + ':' + item_data.ks_chart_date_groupby;

                    if (activePoint._chart.data.domains) {
                        var sequnce = item_data.sequnce ? item_data.sequnce : 0;
                        var domain = activePoint._chart.data.domains[activePoint._index]
                        if (item_data.max_sequnce != 0 && sequnce < item_data.max_sequnce) {
                            ajax.jsonRpc('/fetch/drill_down/data', 'call', {
                                model: 'ks_dashboard_ninja.item',
                                method: 'ks_fetch_drill_down_data_controller',
                                args: [],
                                kwargs: {
                                    'item_id': item_id,
                                    'domain': domain,
                                    'sequence': sequnce,
                                    'type': ks_self.data_selection,
                                }
                            }).then(function(result) {
                                ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                if (result.ks_chart_data) {
                                    ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                    ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                    }

                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    ks_self._renderChart($(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                                } else {
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    }

                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    var $container = ks_self._renderListViewData(item_data);
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                                }
                            });
                        }
                    }
                }
            } else {
                var item_id = $(evt.target).parent().data().itemId;
                if (ks_self.config.ks_item_data[item_id].max_sequnce) {
                    clearInterval(this.ksUpdateDashboard[item_id]);
                    delete ks_self.ksUpdateDashboard[item_id];
                    var sequence = $(evt.target).parent().data().sequence ? $(evt.target).parent().data().sequence : 0;

                    var domain = $(evt.target).parent().data().domain;

                    if ($(evt.target).parent().data().last_seq !== sequence) {
                        ajax.jsonRpc('/fetch/drill_down/data', 'call', {
                            model: 'ks_dashboard_ninja.item',
                            method: 'ks_fetch_drill_down_data_controller',
                            args: [],
                            kwargs: {
                                'item_id': item_id,
                                'domain': domain,
                                'sequence': sequence,
                                'type': ks_self.data_selection,
                            }
                        }).then(function(result) {
                            if (result.ks_list_view_data) {
                                if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['domains'] = {}
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                }
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_pager").addClass('d-none');

                                var item_data = ks_self.config.ks_item_data[item_id]
                                var $container = ks_self._renderListViewData(item_data);
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                            } else {
                                ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['domains'] = {}
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                }
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_pager").addClass('d-none')
                                var item_data = ks_self.config.ks_item_data[item_id]
                                ks_self._renderChart($(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                            }
                        });
                    }
                }
            }
        },

        ks_set_default_chart_view: function() {
            Chart.plugins.unregister(ChartDataLabels);
            Chart.plugins.register({
                afterDraw: function(chart) {
                    if (chart.data.labels.length === 0) {
                        // No data is present
                        var ctx = chart.chart.ctx;
                        var width = chart.chart.width;
                        var height = chart.chart.height
                        chart.clear();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = "3rem 'Lucida Grande'";
                        ctx.fillText('No data available', width / 2, height / 2);
                        ctx.restore();
                    }
                }
            });

            Chart.Legend.prototype.afterFit = function() {
                var chart_type = this.chart.config.type;
                if (chart_type === "pie" || chart_type === "doughnut") {
                    this.height = this.height;
                } else {
                    this.height = this.height + 20;
                };
            };
        },

        ksOnDrillUp: function(e) {
            var ks_self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = ks_self.config.ks_item_data[item_id];
            if (item_data) {
                if ('domains' in item_data) {
                    if (item_data.sequnce) {
                        var domain = item_data['domains'] ? item_data['domains'][item_data.sequnce - 1] : [];
                        var sequnce = item_data.sequnce - 2;

                        if (sequnce >= 0) {
                            ajax.jsonRpc('/fetch/drill_down/data', 'call', {
                                model: 'ks_dashboard_ninja.item',
                                method: 'ks_fetch_drill_down_data_controller',
                                args: [],
                                kwargs: {
                                    'item_id': item_id,
                                    'domain': domain,
                                    'sequence': sequnce,
                                    'type': ks_self.data_selection,
                                }
                            }).then(function(result) {
                                ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                if (result.ks_list_view_type) {
                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                }

                                ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                if (result.ks_chart_data) {
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    ks_self._renderChart($(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                                } else {
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    }

                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    var $container = ks_self._renderListViewData(item_data);
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                                }

                            });
                        } else {
                            $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                            ks_self.ksFetchUpdateItem(item_id);
                            var updateValue = ks_self.config.ks_item_data[item_id]["ks_update_items_data"];
                            if (updateValue) {
                                var updateinterval = setInterval(function() {
                                    ks_self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                                ks_self.ksUpdateDashboard[item_id] = updateinterval;
                            }
                        }
                    } else {
                        $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                    }
                } else {
                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                    ks_self.ksFetchUpdateItem(item_id);
                    var updateValue = ks_self.config.ks_item_data[item_id]["ks_update_items_data"];
                    if (updateValue) {
                        var updateinterval = setInterval(function() {
                            ks_self.ksFetchUpdateItem(item_id)
                        }, updateValue);
                        ks_self.ksUpdateDashboard[item_id] = updateinterval;
                    }
                }
            }
        },

        ksLoadMoreRecords: function(e) {
            var self = this;
            var ks_intial_count = e.target.parentElement.dataset.prevOffset;
            var ks_offset = e.target.parentElement.dataset.next_offset;
            var dashboard_id = self.$target.attr('data-id');
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.config.ks_item_data[itemId].ks_pagination_limit;
            if (itemId in self.ksUpdateDashboard) {
                clearInterval(self.ksUpdateDashboard[itemId])
                delete self.ksUpdateDashboard[itemId];
            }
            var params = self.ksGetParamsForItemFetch(parseInt(itemId));
            ajax.jsonRpc('/next/offset', 'call', {
                model: 'ks_dashboard_ninja.item',
                method: 'ks_get_next_offset_controller',
                args: [],
                kwargs: {
                    'item_id': parseInt(itemId),
                    'offset': {
                        ks_intial_count: ks_intial_count,
                        offset: ks_offset
                    },
                    'dashboard_id': parseInt(dashboard_id),
                    'type': self.data_selection,
                    'params':params,
                },
                context: self.getContext(),
            }).then(function(result) {
                var item_data = self.config.ks_item_data[itemId];
                self.config.ks_item_data[itemId]['ks_list_view_data'] = result.ks_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self._renderListViewData(item_data));
                $(e.currentTarget).parents('.ks_pager').find('.ks_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.ks_load_previous').removeClass('ks_event_offer_list');
                if (result.next_offset < parseInt(result.offset) + (offset - 1) || result.next_offset == item_data.ks_record_count || result.next_offset === result.limit){
                    $(e.currentTarget).addClass('ks_event_offer_list');
                }
            });
        },

        ksGetParamsForItemFetch: function(){
            return {};
        },

        ksLoadPreviousRecords: function(e) {
            var self = this;
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.config.ks_item_data[itemId].ks_pagination_limit;
            var ks_offset =  parseInt(e.target.parentElement.dataset.prevOffset) - (offset + 1) ;
            var ks_intial_count = e.target.parentElement.dataset.next_offset;

            var dashboard_id = self.$target.attr('data-id');
            var params = self.ksGetParamsForItemFetch(parseInt(itemId));
            if (ks_offset <= 0) {
                var updateValue = self.config.ks_item_data[itemId]["ks_update_items_data"];
                if (updateValue) {
                    var updateinterval = setInterval(function() {
                        self.ksFetchUpdateItem(itemId);
                    }, updateValue);
                    self.ksUpdateDashboard[itemId] = updateinterval;
                }
            }
            ajax.jsonRpc('/next/offset', 'call', {
                model: 'ks_dashboard_ninja.item',
                method: 'ks_get_next_offset_controller',
                args: [],
                kwargs: {
                    'item_id': parseInt(itemId),
                    'offset': {
                        ks_intial_count: ks_intial_count,
                        offset: ks_offset
                    },
                    'dashboard_id': parseInt(dashboard_id),
                    'type': self.data_selection,
                    'params':params,
                },
                context: self.getContext(),
            }).then(function(result) {
                var item_data = self.config.ks_item_data[itemId];
                self.config.ks_item_data[itemId]['ks_list_view_data'] = result.ks_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self._renderListViewData(item_data));
                $(e.currentTarget).parents('.ks_pager').find('.ks_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.ks_load_next').removeClass('ks_event_offer_list');
                if (result.offset === 1) {
                    $(e.currentTarget).addClass('ks_event_offer_list');
                }
            });
        },

    })
    return publicWidget.registry.snippet_dashboard_home_page;
});