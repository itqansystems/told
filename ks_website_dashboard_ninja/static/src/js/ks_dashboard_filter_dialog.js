odoo.define('ks_website_dashboard_ninja.ks_dashboard_selector', function(require){
    'use static';

    var ajax = require('web.ajax');
    var core = require('web.core');
    var animation = require('website.content.snippets.animation');
    var ks_widget = require('web_editor.widget');
    var website = require('website.utils');
    var options = require('web_editor.snippets.options');
    var session = require('web.session');
    var ks_dashboard_ninja = require('ks_website_dashboard_ninja.ks_website_dashboard')

    var _t = core._t;
    var qweb = core.qweb;

    var ks_DashboardSelectionDialog = ks_widget.Dialog.extend({
        start: function() {
             var ks_self = this;
             ks_self.ks_setDashboardData(ks_self);
             ks_self._super();
        },
        ks_setDashboardData:function(modal){
            var self = this;
            ajax.jsonRpc('/dashboard', 'call', {
                model:  'ks_dashboard_ninja.board',
                method: 'ks_dashboard_handler',
                args: [],
                kwargs: {
                }
            }).then(function (data) {
                var main_section = $("<div class='ks_main_div'></div>")
                var select_label = $("<p style='margin: 5px 15px;'>Select Dashboard:</p>")
                var user_options = $("<label class='ks_container'>All Data <input type='radio' name='ks_data' checked='checked' value='all_data'> <span class='checkmark'></span></label> <label class='ks_container'>User Data <input type='radio' name='ks_data' value='user_data'> <span class='checkmark'></span></label>")
                select_label.appendTo(main_section)
                var select = $("<select></select>").attr("id", "ks_slider_selection").attr("name", "Selection slider");
                $.each(data, function(index, item){
                    var ks_dashboard_drop = "#dashboard-id-" + (item.id)
                    if($(ks_dashboard_drop).length === 0){
                        select.append($("<option></option>").attr("value", item.name).attr("id", item.id).text(item.name));
                    }
                });
                if(select.find("option").length){
                    select_label.after(select[0]);
                    select[0].after(user_options[0], user_options[2]);
                    $(modal.$el).append(main_section);
                }
                else{
                    $(modal.$el).append(_t("No Slider For this page"));
                }
            });
        }
    });

    options.registry.dashboard_selector_action = options.Class.extend({
        on_prompt: function(ks_self){
            var dialog = new ks_DashboardSelectionDialog(ks_self, {
                title: _t("Select Dashboard"),
            });
            dialog.open();
            dialog.on('save', this, function(){
                ks_self.dashboard_id = $('#ks_slider_selection').find(":selected").attr("id");
                ks_self.data_selection = $('input:radio:checked').attr('value')
                var ks_web_dashboard =  new animation.registry.snippet_dashboard_home_page(ks_self);
                ks_web_dashboard.start(ks_self.dashboard_id, ks_self.data_selection, ks_self);
            });
            dialog.on('cancel', this, function(){
                this.$target.remove();
            })
        },
        onBuilt: function() {
            var ks_self = this;
            ks_self.on_prompt(ks_self)
            return this._super();
        },
        cleanForSave: function() {
            this.$target.empty();
        },
    });
    return ks_DashboardSelectionDialog;
});
