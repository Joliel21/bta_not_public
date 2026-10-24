<?php
/**
 * Plugin Name: The Words We Carry Analytics
 * Plugin URI: https://breathtakingawareness.com/
 * Description: Tracks reader, content, ad, sponsor, CTA, video, podcast, and completion events for The Words We Carry. Provides admin dashboards and sponsor-safe reporting endpoints.
 * Version: 1.0.1
 * Author: Breathtaking Awareness
 * Author URI: https://breathtakingawareness.com/
 * Text Domain: the-words-we-carry-analytics
 */

if (!defined('ABSPATH')) {
    exit;
}


/**
 * CONNECTION PASS STATUS
 *
 * Plugin role:
 * - Owns event tracking, analytics storage, summary reports, event inspection, and sponsor-safe analytics reports.
 *
 * Current status:
 * - Connection-pass cleanup version.
 * - Receives events from the reader and supports sponsor-specific reporting for Ads/Sponsors Plugin dashboards.
 *
 * Owns:
 * - Analytics event database table.
 * - Event collection endpoint.
 * - Admin analytics dashboard and events inspector.
 * - Sponsor-safe report endpoint.
 *
 * Does not own:
 * - Reader display shell or built JS/CSS.
 * - Magazine article/page/chapter content.
 * - Sponsor profile/campaign/ad record management.
 *
 * Connected endpoints:
 * - /wp-json/the-words-we-carry-analytics/v1/event
 * - /wp-json/the-words-we-carry-analytics/v1/summary
 * - /wp-json/the-words-we-carry-analytics/v1/sponsor-report
 *
 * Public GitHub:
 * - Do not move this plugin source to public GitHub. Private backup/private GitHub only.
 */

if (!class_exists('The_Words_We_Carry_Analytics')) {
    final class The_Words_We_Carry_Analytics {
        const VERSION = '1.0.1';
        const OPTION_KEY = 'twwc_analytics_settings';
        const NONCE_ACTION = 'wp_rest';

        private static $instance = null;
        private $table_name = '';

        public static function instance() {
            if (self::$instance === null) {
                self::$instance = new self();
            }
            return self::$instance;
        }

        private function __construct() {
            global $wpdb;
            $this->table_name = $wpdb->prefix . 'twwc_analytics_events';

            add_action('init', [$this, 'register_roles_and_caps']);
            add_action('admin_menu', [$this, 'register_admin_menu']);
            add_action('admin_init', [$this, 'register_settings']);
            add_action('rest_api_init', [$this, 'register_rest_routes']);
            add_action('plugins_loaded', [$this, 'maybe_upgrade']);
        }

        public static function activate() {
            $instance = self::instance();
            $instance->create_tables();
            $instance->register_roles_and_caps();
            flush_rewrite_rules();
        }

        public static function deactivate() {
            flush_rewrite_rules();
        }

        public function maybe_upgrade() {
            $settings = $this->get_settings();
            if (empty($settings['db_version']) || $settings['db_version'] !== self::VERSION) {
                $this->create_tables();
                $settings['db_version'] = self::VERSION;
                update_option(self::OPTION_KEY, $settings);
            }
        }

        public function register_roles_and_caps() {
            $admin = get_role('administrator');
            if ($admin) {
                $admin->add_cap('twwc_manage_analytics');
                $admin->add_cap('twwc_view_analytics');
                $admin->add_cap('twwc_view_sponsor_analytics');
            }

            $editor = get_role('editor');
            if ($editor) {
                $editor->add_cap('twwc_view_analytics');
            }

            $sponsor = get_role('twwc_magazine_sponsor');
            if (!$sponsor) {
                $sponsor = add_role(
                    'twwc_magazine_sponsor',
                    __('Magazine Sponsor', 'the-words-we-carry-analytics'),
                    ['read' => true, 'twwc_view_sponsor_analytics' => true]
                );
            } elseif ($sponsor) {
                $sponsor->add_cap('twwc_view_sponsor_analytics');
            }

            $sponsor_manager = get_role('twwc_magazine_sponsor_manager');
            if (!$sponsor_manager) {
                $sponsor_manager = add_role(
                    'twwc_magazine_sponsor_manager',
                    __('Magazine Sponsor Manager', 'the-words-we-carry-analytics'),
                    ['read' => true, 'twwc_view_sponsor_analytics' => true, 'twwc_view_analytics' => true]
                );
            } elseif ($sponsor_manager) {
                $sponsor_manager->add_cap('twwc_view_sponsor_analytics');
                $sponsor_manager->add_cap('twwc_view_analytics');
            }
        }

        public function create_tables() {
            global $wpdb;
            require_once ABSPATH . 'wp-admin/includes/upgrade.php';

            $charset_collate = $wpdb->get_charset_collate();
            $sql = "CREATE TABLE {$this->table_name} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                event_type varchar(100) NOT NULL,
                issue_id varchar(191) DEFAULT '' NOT NULL,
                chapter_id varchar(191) DEFAULT '' NOT NULL,
                article_id varchar(191) DEFAULT '' NOT NULL,
                page_id varchar(191) DEFAULT '' NOT NULL,
                sponsor_id varchar(191) DEFAULT '' NOT NULL,
                campaign_id varchar(191) DEFAULT '' NOT NULL,
                ad_id varchar(191) DEFAULT '' NOT NULL,
                placement_id varchar(191) DEFAULT '' NOT NULL,
                cta_id varchar(191) DEFAULT '' NOT NULL,
                media_id varchar(191) DEFAULT '' NOT NULL,
                media_type varchar(50) DEFAULT '' NOT NULL,
                session_id varchar(191) DEFAULT '' NOT NULL,
                viewer_hash varchar(64) DEFAULT '' NOT NULL,
                page_url text NULL,
                referrer_url text NULL,
                context varchar(191) DEFAULT '' NOT NULL,
                metadata_json longtext NULL,
                created_at datetime NOT NULL,
                PRIMARY KEY  (id),
                KEY event_type (event_type),
                KEY issue_id (issue_id),
                KEY page_id (page_id),
                KEY sponsor_id (sponsor_id),
                KEY campaign_id (campaign_id),
                KEY ad_id (ad_id),
                KEY placement_id (placement_id),
                KEY created_at (created_at)
            ) $charset_collate;";

            dbDelta($sql);
        }

        public function register_admin_menu() {
            add_menu_page(
                __('TWWC Analytics', 'the-words-we-carry-analytics'),
                __('TWWC Analytics', 'the-words-we-carry-analytics'),
                'twwc_view_analytics',
                'twwc-analytics',
                [$this, 'render_dashboard_page'],
                'dashicons-chart-area',
                58
            );

            add_submenu_page(
                'twwc-analytics',
                __('Dashboard', 'the-words-we-carry-analytics'),
                __('Dashboard', 'the-words-we-carry-analytics'),
                'twwc_view_analytics',
                'twwc-analytics',
                [$this, 'render_dashboard_page']
            );

            add_submenu_page(
                'twwc-analytics',
                __('Events Inspector', 'the-words-we-carry-analytics'),
                __('Events Inspector', 'the-words-we-carry-analytics'),
                'twwc_view_analytics',
                'twwc-analytics-events',
                [$this, 'render_events_page']
            );

            add_submenu_page(
                'twwc-analytics',
                __('Settings', 'the-words-we-carry-analytics'),
                __('Settings', 'the-words-we-carry-analytics'),
                'twwc_manage_analytics',
                'twwc-analytics-settings',
                [$this, 'render_settings_page']
            );
        }

        public function register_settings() {
            register_setting(
                'twwc_analytics_settings_group',
                self::OPTION_KEY,
                [$this, 'sanitize_settings']
            );

            add_settings_section(
                'twwc_analytics_main',
                __('Analytics Settings', 'the-words-we-carry-analytics'),
                function () {
                    echo '<p>Configure tracking, retention, and endpoint behavior for The Words We Carry Analytics.</p>';
                },
                'twwc-analytics-settings'
            );

            $fields = [
                'allow_public_tracking' => 'Allow public event tracking endpoint',
                'salt' => 'Viewer hash salt',
                'retention_days' => 'Retention days (0 = keep forever)',
                'default_issue_id' => 'Default issue ID',
            ];

            foreach ($fields as $key => $label) {
                add_settings_field(
                    $key,
                    __($label, 'the-words-we-carry-analytics'),
                    [$this, 'render_settings_field'],
                    'twwc-analytics-settings',
                    'twwc_analytics_main',
                    ['key' => $key]
                );
            }
        }

        public function sanitize_settings($input) {
            $existing = $this->get_settings();
            $output = $existing;
            $output['allow_public_tracking'] = !empty($input['allow_public_tracking']) ? 1 : 0;
            $output['salt'] = isset($input['salt']) ? sanitize_text_field($input['salt']) : $existing['salt'];
            $output['retention_days'] = isset($input['retention_days']) ? max(0, absint($input['retention_days'])) : $existing['retention_days'];
            $output['default_issue_id'] = isset($input['default_issue_id']) ? sanitize_text_field($input['default_issue_id']) : $existing['default_issue_id'];
            $output['db_version'] = self::VERSION;
            return $output;
        }

        public function render_settings_field($args) {
            $settings = $this->get_settings();
            $key = $args['key'];
            $value = isset($settings[$key]) ? $settings[$key] : '';

            if ($key === 'allow_public_tracking') {
                echo '<label><input type="checkbox" name="' . esc_attr(self::OPTION_KEY) . '[' . esc_attr($key) . ']" value="1" ' . checked(1, (int) $value, false) . '> Enable</label>';
                return;
            }

            $type = ($key === 'retention_days') ? 'number' : 'text';
            echo '<input type="' . esc_attr($type) . '" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[' . esc_attr($key) . ']" value="' . esc_attr($value) . '">';
        }

        private function get_settings() {
            $defaults = [
                'allow_public_tracking' => 1,
                'salt' => wp_generate_password(24, false, false),
                'retention_days' => 365,
                'default_issue_id' => '',
                'db_version' => self::VERSION,
            ];

            $settings = get_option(self::OPTION_KEY, []);
            return wp_parse_args($settings, $defaults);
        }

        public function render_dashboard_page() {
            if (!current_user_can('twwc_view_analytics')) {
                wp_die(__('You do not have permission to view this page.', 'the-words-we-carry-analytics'));
            }

            $summary = $this->get_summary_data();
            ?>
            <div class="wrap">
                <h1><?php esc_html_e('TWWC Analytics Dashboard', 'the-words-we-carry-analytics'); ?></h1>
                <p><?php esc_html_e('High-level summary of reader, content, sponsor, and ad activity.', 'the-words-we-carry-analytics'); ?></p>
                <table class="widefat striped" style="max-width:900px;">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Metric', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Value', 'the-words-we-carry-analytics'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($summary as $label => $value) : ?>
                            <tr>
                                <td><?php echo esc_html($label); ?></td>
                                <td><?php echo esc_html((string) $value); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p style="margin-top:16px;">
                    <strong><?php esc_html_e('Tracking endpoint:', 'the-words-we-carry-analytics'); ?></strong>
                    <code><?php echo esc_html(rest_url('the-words-we-carry-analytics/v1/event')); ?></code>
                </p>
            </div>
            <?php
        }

        public function render_events_page() {
            if (!current_user_can('twwc_view_analytics')) {
                wp_die(__('You do not have permission to view this page.', 'the-words-we-carry-analytics'));
            }

            global $wpdb;
            $rows = $wpdb->get_results("SELECT * FROM {$this->table_name} ORDER BY created_at DESC LIMIT 100", ARRAY_A);
            ?>
            <div class="wrap">
                <h1><?php esc_html_e('TWWC Events Inspector', 'the-words-we-carry-analytics'); ?></h1>
                <p><?php esc_html_e('Latest 100 analytics events.', 'the-words-we-carry-analytics'); ?></p>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th><?php esc_html_e('Event', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Issue', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Page', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Sponsor', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Campaign', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Ad', 'the-words-we-carry-analytics'); ?></th>
                            <th><?php esc_html_e('Created', 'the-words-we-carry-analytics'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($rows)) : ?>
                            <tr><td colspan="8"><?php esc_html_e('No events recorded yet.', 'the-words-we-carry-analytics'); ?></td></tr>
                        <?php else : ?>
                            <?php foreach ($rows as $row) : ?>
                                <tr>
                                    <td><?php echo esc_html($row['id']); ?></td>
                                    <td><?php echo esc_html($row['event_type']); ?></td>
                                    <td><?php echo esc_html($row['issue_id']); ?></td>
                                    <td><?php echo esc_html($row['page_id']); ?></td>
                                    <td><?php echo esc_html($row['sponsor_id']); ?></td>
                                    <td><?php echo esc_html($row['campaign_id']); ?></td>
                                    <td><?php echo esc_html($row['ad_id']); ?></td>
                                    <td><?php echo esc_html($row['created_at']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            <?php
        }

        public function render_settings_page() {
            if (!current_user_can('twwc_manage_analytics')) {
                wp_die(__('You do not have permission to manage this page.', 'the-words-we-carry-analytics'));
            }
            ?>
            <div class="wrap">
                <h1><?php esc_html_e('TWWC Analytics Settings', 'the-words-we-carry-analytics'); ?></h1>
                <form method="post" action="options.php">
                    <?php
                    settings_fields('twwc_analytics_settings_group');
                    do_settings_sections('twwc-analytics-settings');
                    submit_button();
                    ?>
                </form>
            </div>
            <?php
        }

        public function register_rest_routes() {
            register_rest_route('the-words-we-carry-analytics/v1', '/event', [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'handle_track_event'],
                'permission_callback' => [$this, 'can_track_event'],
            ]);

            register_rest_route('the-words-we-carry-analytics/v1', '/summary', [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'handle_summary'],
                'permission_callback' => function () {
                    return current_user_can('twwc_view_analytics');
                },
            ]);

            register_rest_route('the-words-we-carry-analytics/v1', '/sponsor-report', [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'handle_sponsor_report'],
                'permission_callback' => [$this, 'can_view_sponsor_report'],
            ]);
        }

        public function can_track_event(WP_REST_Request $request) {
            $settings = $this->get_settings();
            if (!empty($settings['allow_public_tracking'])) {
                return true;
            }
            return current_user_can('twwc_view_analytics');
        }

        public function handle_track_event(WP_REST_Request $request) {
            global $wpdb;

            $payload = $this->sanitize_event_payload($request->get_json_params());
            if (empty($payload['event_type'])) {
                return new WP_REST_Response(['success' => false, 'message' => 'Missing event_type.'], 400);
            }

            $result = $wpdb->insert(
                $this->table_name,
                [
                    'event_type'   => $payload['event_type'],
                    'issue_id'     => $payload['issue_id'],
                    'chapter_id'   => $payload['chapter_id'],
                    'article_id'   => $payload['article_id'],
                    'page_id'      => $payload['page_id'],
                    'sponsor_id'   => $payload['sponsor_id'],
                    'campaign_id'  => $payload['campaign_id'],
                    'ad_id'        => $payload['ad_id'],
                    'placement_id' => $payload['placement_id'],
                    'cta_id'       => $payload['cta_id'],
                    'media_id'     => $payload['media_id'],
                    'media_type'   => $payload['media_type'],
                    'session_id'   => $payload['session_id'],
                    'viewer_hash'  => $payload['viewer_hash'],
                    'page_url'     => $payload['page_url'],
                    'referrer_url' => $payload['referrer_url'],
                    'context'      => $payload['context'],
                    'metadata_json'=> wp_json_encode($payload['metadata']),
                    'created_at'   => current_time('mysql', true),
                ],
                ['%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s']
            );

            if (!$result) {
                return new WP_REST_Response(['success' => false, 'message' => 'Event could not be recorded.'], 500);
            }

            $this->maybe_prune_old_events();

            return new WP_REST_Response([
                'success' => true,
                'eventId' => (int) $wpdb->insert_id,
            ], 201);
        }

        private function sanitize_event_payload($payload) {
            $payload = is_array($payload) ? $payload : [];
            $settings = $this->get_settings();

            $session_id = isset($payload['sessionId']) ? sanitize_text_field($payload['sessionId']) : '';
            $viewer_seed = isset($payload['viewerId']) ? sanitize_text_field($payload['viewerId']) : $session_id;
            $viewer_hash = '';
            if ($viewer_seed !== '') {
                $viewer_hash = hash('sha256', $settings['salt'] . '|' . $viewer_seed);
            }

            return [
                'event_type'   => isset($payload['eventType']) ? sanitize_key($payload['eventType']) : '',
                'issue_id'     => isset($payload['issueId']) ? sanitize_text_field($payload['issueId']) : $settings['default_issue_id'],
                'chapter_id'   => isset($payload['chapterId']) ? sanitize_text_field($payload['chapterId']) : '',
                'article_id'   => isset($payload['articleId']) ? sanitize_text_field($payload['articleId']) : '',
                'page_id'      => isset($payload['pageId']) ? sanitize_text_field($payload['pageId']) : '',
                'sponsor_id'   => isset($payload['sponsorId']) ? sanitize_text_field($payload['sponsorId']) : '',
                'campaign_id'  => isset($payload['campaignId']) ? sanitize_text_field($payload['campaignId']) : '',
                'ad_id'        => isset($payload['adId']) ? sanitize_text_field($payload['adId']) : '',
                'placement_id' => isset($payload['placementId']) ? sanitize_text_field($payload['placementId']) : '',
                'cta_id'       => isset($payload['ctaId']) ? sanitize_text_field($payload['ctaId']) : '',
                'media_id'     => isset($payload['mediaId']) ? sanitize_text_field($payload['mediaId']) : '',
                'media_type'   => isset($payload['mediaType']) ? sanitize_text_field($payload['mediaType']) : '',
                'session_id'   => $session_id,
                'viewer_hash'  => $viewer_hash,
                'page_url'     => isset($payload['pageUrl']) ? esc_url_raw($payload['pageUrl']) : '',
                'referrer_url' => isset($payload['referrerUrl']) ? esc_url_raw($payload['referrerUrl']) : '',
                'context'      => isset($payload['context']) ? sanitize_text_field($payload['context']) : '',
                'metadata'     => isset($payload['metadata']) && is_array($payload['metadata']) ? $this->sanitize_recursive($payload['metadata']) : [],
            ];
        }

        private function sanitize_recursive($value) {
            if (is_array($value)) {
                $clean = [];
                foreach ($value as $k => $v) {
                    $clean[sanitize_text_field((string) $k)] = $this->sanitize_recursive($v);
                }
                return $clean;
            }
            return is_scalar($value) ? sanitize_text_field((string) $value) : '';
        }

        public function handle_summary(WP_REST_Request $request) {
            return new WP_REST_Response([
                'success' => true,
                'data' => $this->get_summary_data($request->get_params()),
            ]);
        }

        public function can_view_sponsor_report(WP_REST_Request $request) {
            if (current_user_can('twwc_view_analytics')) {
                return true;
            }

            if (!is_user_logged_in() || !current_user_can('twwc_view_sponsor_analytics')) {
                return false;
            }

            $sponsor_id = sanitize_text_field((string) $request->get_param('sponsorId'));
            if ($sponsor_id === '') {
                return false;
            }

            return $this->user_can_view_sponsor($sponsor_id, get_current_user_id());
        }

        public function handle_sponsor_report(WP_REST_Request $request) {
            $sponsor_id = sanitize_text_field((string) $request->get_param('sponsorId'));
            if ($sponsor_id === '') {
                return new WP_REST_Response(['success' => false, 'message' => 'Missing sponsorId.'], 400);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $this->get_sponsor_report($sponsor_id, $request->get_params()),
            ]);
        }

        private function user_can_view_sponsor($sponsor_id, $user_id) {
            $possible_keys = [
                'twwc_assigned_user_id',
                '_twwc_assigned_user_id',
                'assigned_user_id',
                '_assigned_user_id',
            ];

            foreach ($possible_keys as $key) {
                $assigned = get_post_meta((int) $sponsor_id, $key, true);
                if (!empty($assigned) && (int) $assigned === (int) $user_id) {
                    return true;
                }
            }

            return false;
        }

        private function get_summary_data($filters = []) {
            global $wpdb;
            $where = $this->build_where_clause($filters);

            $total_events = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where}");
            $issues_opened = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'issue_opened'");
            $page_views = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'page_view'");
            $article_views = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'article_view'");
            $ad_impressions = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'ad_impression'");
            $ad_clicks = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'ad_click'");
            $sign_up_clicks = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'sign_up_click'");
            $shares = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'share_click'");
            $completions = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} {$where} AND event_type = 'issue_completed'");

            $ctr = ($ad_impressions > 0) ? round(($ad_clicks / $ad_impressions) * 100, 2) . '%' : '0%';

            return [
                'Total Events' => $total_events,
                'Issue Opened' => $issues_opened,
                'Page Views' => $page_views,
                'Article Views' => $article_views,
                'Ad Impressions' => $ad_impressions,
                'Ad Clicks' => $ad_clicks,
                'Ad CTR' => $ctr,
                'Sign-Up Clicks' => $sign_up_clicks,
                'Share Clicks' => $shares,
                'Issue Completions' => $completions,
            ];
        }

        private function get_sponsor_report($sponsor_id, $filters = []) {
            global $wpdb;
            $filters['sponsorId'] = $sponsor_id;
            $where = $this->build_where_clause($filters);

            $campaign_rows = $wpdb->get_results(
                "SELECT campaign_id,
                        SUM(CASE WHEN event_type = 'ad_impression' THEN 1 ELSE 0 END) AS impressions,
                        SUM(CASE WHEN event_type = 'ad_click' THEN 1 ELSE 0 END) AS clicks
                 FROM {$this->table_name}
                 {$where}
                 GROUP BY campaign_id
                 ORDER BY clicks DESC, impressions DESC",
                ARRAY_A
            );

            $placement_rows = $wpdb->get_results(
                "SELECT placement_id,
                        page_id,
                        SUM(CASE WHEN event_type = 'ad_impression' THEN 1 ELSE 0 END) AS impressions,
                        SUM(CASE WHEN event_type = 'ad_click' THEN 1 ELSE 0 END) AS clicks
                 FROM {$this->table_name}
                 {$where}
                 GROUP BY placement_id, page_id
                 ORDER BY clicks DESC, impressions DESC",
                ARRAY_A
            );

            $summary = [
                'sponsorId' => $sponsor_id,
                'totalImpressions' => 0,
                'totalClicks' => 0,
                'ctr' => '0%',
                'campaigns' => [],
                'placements' => [],
            ];

            foreach ($campaign_rows as $row) {
                $impressions = (int) $row['impressions'];
                $clicks = (int) $row['clicks'];
                $summary['totalImpressions'] += $impressions;
                $summary['totalClicks'] += $clicks;
                $summary['campaigns'][] = [
                    'campaignId' => (string) $row['campaign_id'],
                    'impressions' => $impressions,
                    'clicks' => $clicks,
                    'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) . '%' : '0%',
                ];
            }

            foreach ($placement_rows as $row) {
                $impressions = (int) $row['impressions'];
                $clicks = (int) $row['clicks'];
                $summary['placements'][] = [
                    'placementId' => (string) $row['placement_id'],
                    'pageId' => (string) $row['page_id'],
                    'impressions' => $impressions,
                    'clicks' => $clicks,
                    'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) . '%' : '0%',
                ];
            }

            if ($summary['totalImpressions'] > 0) {
                $summary['ctr'] = round(($summary['totalClicks'] / $summary['totalImpressions']) * 100, 2) . '%';
            }

            return $summary;
        }

        private function build_where_clause($filters = []) {
            global $wpdb;
            $clauses = ['WHERE 1=1'];

            $map = [
                'issueId' => 'issue_id',
                'pageId' => 'page_id',
                'sponsorId' => 'sponsor_id',
                'campaignId' => 'campaign_id',
                'adId' => 'ad_id',
                'placementId' => 'placement_id',
                'eventType' => 'event_type',
            ];

            foreach ($map as $input_key => $column) {
                if (!empty($filters[$input_key])) {
                    $clauses[] = $wpdb->prepare("AND {$column} = %s", sanitize_text_field((string) $filters[$input_key]));
                }
            }

            if (!empty($filters['dateFrom'])) {
                $clauses[] = $wpdb->prepare('AND created_at >= %s', sanitize_text_field((string) $filters['dateFrom']));
            }
            if (!empty($filters['dateTo'])) {
                $clauses[] = $wpdb->prepare('AND created_at <= %s', sanitize_text_field((string) $filters['dateTo']));
            }

            return ' ' . implode(' ', $clauses) . ' ';
        }

        private function maybe_prune_old_events() {
            $settings = $this->get_settings();
            $retention_days = (int) $settings['retention_days'];
            if ($retention_days <= 0) {
                return;
            }

            global $wpdb;
            $cutoff = gmdate('Y-m-d H:i:s', strtotime('-' . $retention_days . ' days'));
            $wpdb->query($wpdb->prepare("DELETE FROM {$this->table_name} WHERE created_at < %s", $cutoff));
        }
    }

    register_activation_hook(__FILE__, ['The_Words_We_Carry_Analytics', 'activate']);
    register_deactivation_hook(__FILE__, ['The_Words_We_Carry_Analytics', 'deactivate']);

    The_Words_We_Carry_Analytics::instance();
}
