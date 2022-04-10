odoo.define('ks_dashboard_ninja.ks_to_do_dashboard_filter', function (require) {
"use strict";

var KsDashboard = require('ks_website_dashboard_ninja.ks_website_dashboard');
var core = require('web.core');
var _t = core._t;
var QWeb = core.qweb;
var Dialog = require('web.Dialog');

return KsDashboard.include({
         events: _.extend({}, KsDashboard.prototype.events, {
//        'click .ks_edit_content': '_onKsEditTask',
//        'click .ks_delete_content': '_onKsDeleteContent',
//        'click .header_add_btn': '_onKsAddTask',
////        'click .ks_add_section': '_onKsAddSection',
//        'click .ks_li_tab': '_onKsUpdateAddButtonAttribute',
//        'click .ks_do_item_line_through': '_onKsActiveHandler',
    }),

        ksRenderToDoDashboardView: function(item){
            var self = this;
            var item_title = item.name;
            var item_id = item.id;
            var list_to_do_data = JSON.parse(item.ks_to_do_data)
            var ks_header_color = self._ks_get_rgba_format(item.ks_header_bg_color);
            var ks_font_color = self._ks_get_rgba_format(item.ks_font_color);
            var ks_rgba_button_color = self._ks_get_rgba_format(item.ks_button_color);
            var $ksItemContainer = self.ksRenderToDoView(item);
            var $ks_gridstack_container = $(QWeb.render('ks_to_do_dashboard_container', {
                ks_chart_title: item_title,
                ksIsDashboardManager: self.config.ks_dashboard_manager,
                ks_dashboard_list: self.config.ks_dashboard_list,
                item_id: item_id,
                to_do_view_data: list_to_do_data,
            })).addClass('ks_dashboarditem_id')
            $ks_gridstack_container.find('.ks_card_header').addClass('ks_bg_to_color').css({"background-color": ks_header_color });
            $ks_gridstack_container.find('.ks_card_header').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_li_tab').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_list_view_heading').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_to_do_card_body').append($ksItemContainer);
            $ks_gridstack_container.find('.header_add_btn').addClass('d-none');

            return $ks_gridstack_container;
        },

        ksRenderToDoView: function(item, ks_tv_play=true) {
            var self = this;
            var  item_id = item.id;
            var list_to_do_data = JSON.parse(item.ks_to_do_data);
            var $todoViewContainer = $(QWeb.render('ks_to_do_dashboard_inner_container', {
                ks_to_do_view_name: "Test",
                to_do_view_data: list_to_do_data,
                item_id: item_id,
                ks_tv_play: ks_tv_play
            }));

            return $todoViewContainer
        },


})

});