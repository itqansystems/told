from odoo import http, fields
from odoo.http import request
from odoo.exceptions import MissingError


class KsWebsiteDashboard(http.Controller):

    @http.route(['/dashboard'], type='json', auth='public', website=True)
    def ks_dashboard_handler(self):
        dashboard_records = request.env['ks_dashboard_ninja.board'].sudo().search_read([])

        return dashboard_records

    @http.route(['/dashboard/data'], type='json', auth='public', website=True)
    def ks_dashboard_data_handler(self, **post):
        ks_company_id = ['|', ['ks_company_id', '=', False]]

        ks_dashboard_id = post.get('kwargs').get('id')
        ks_type = post.get('kwargs').get('type')
        params = post.get('kwargs').get('params')

        if self.ks_check_login_user_or_not():
            ks_company_id.append(['ks_company_id', '=', request.env.user.company_id.id])
        else:
            ks_company_id.append(['ks_company_id', '=', request.website.company_id.id])

        if ks_dashboard_id != 0:
            try:
                if ks_type == 'user_data':
                    dashboard_config = {}
                    if request.env.user in request.env['res.users'].sudo().search([]):
                        dashboard_config = request.env['ks_dashboard_ninja.board'].ks_fetch_dashboard_data(
                            ks_dashboard_id,params)
                else:
                    dashboard_config = request.env['ks_dashboard_ninja.board'].sudo().ks_fetch_dashboard_data(
                        ks_dashboard_id,params)
                dashboard_config['ks_dashboard_manager'] = False
                dashboard_config['type'] = ks_type
                dashboard_config['login'] = self.ks_check_login_user_or_not()
            except MissingError:
                return "missingerror"
            return dashboard_config

        return {}

    @http.route(['/fetch/item/update'], type='json', auth='public', website=True)
    def ks_fetch_item_controller(self, **post):
        item_records = {}
        ks_item_id = post.get('kwargs').get('item_id')
        ks_dashboard_id = post.get('kwargs').get('dashboard')
        ks_type = post.get('kwargs').get('type')
        params = post.get('kwargs').get('params')

        if ks_type == 'user_data':
            if request.env.user in request.env['res.users'].sudo().search([]):
                item_records = request.env['ks_dashboard_ninja.board'].ks_fetch_item([ks_item_id], ks_dashboard_id,params)
        else:
            item_records = request.env['ks_dashboard_ninja.board'].sudo().ks_fetch_item([ks_item_id], ks_dashboard_id,params)

        return item_records

    @http.route(['/fetch/drill_down/data'], type='json', auth='public', website=True)
    def ks_fetch_drill_down_data_controller(self, **post):
        item_records = {}
        if post.get('kwargs').get('type') == 'user_data':
            if request.env.user in request.env['res.users'].sudo().search([]):
                item_records = request.env['ks_dashboard_ninja.item'].ks_fetch_drill_down_data(
                    post.get('kwargs').get('item_id'), post.get('kwargs').get('domain'), post.get('kwargs')
                        .get('sequence'))
        else:
            item_records = request.env['ks_dashboard_ninja.item'].sudo().ks_fetch_drill_down_data(
                post.get('kwargs').get('item_id'), post.get('kwargs').get('domain'), post.get('kwargs').get('sequence'))

        return item_records

    @http.route(['/check/user'], type='json', auth='public', website=True)
    def ks_check_user_login(self):
        return self.ks_check_login_user_or_not()

    @staticmethod
    def ks_check_login_user_or_not():
        if request.env.user in request.env['res.users'].sudo().search([]):
            return True
        return False

    @http.route(['/next/offset'], type='json', auth='public', website=True)
    def ks_get_next_offset_controller(self, **post):
        ks_type = post.get('kwargs').get('type')
        if ks_type == 'user_data':
            ks_offset_record = request.env['ks_dashboard_ninja.board'].ks_get_list_view_data_offset(
                post.get('kwargs').get('item_id'), post.get('kwargs').get('offset'),
                post.get('kwargs').get('dashboard_id'),post.get('kwargs').get('params'))
        else:
            ks_offset_record = request.env['ks_dashboard_ninja.board'].sudo().ks_get_list_view_data_offset(
                post.get('kwargs').get('item_id'), post.get('kwargs').get('offset'),
                post.get('kwargs').get('dashboard_id'),post.get('kwargs').get('params'))
        return ks_offset_record

    @http.route(['/fetch/date_filter_selection/data'], type='json', auth='public', website=True)
    def ks_fetch_date_filter_selection(self, **post):
        return request.env['ks_dashboard_ninja.board'].fields_get(allfields=['ks_date_filter_selection'])['ks_date_filter_selection']['selection']