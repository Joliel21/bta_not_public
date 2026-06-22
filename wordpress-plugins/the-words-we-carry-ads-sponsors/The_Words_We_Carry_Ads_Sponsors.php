<?php
/**
 * Plugin Name: The Words We Carry Ads & Sponsors
 * Description: Ads, sponsor profiles, campaigns, placements, sponsor access, and sponsor-facing reporting shell for The Words We Carry magazine reader.
 * Version: 1.0.2
 * Author: Breathtaking Awareness
 * Text Domain: the-words-we-carry-ads-sponsors
 */

if (!defined('ABSPATH')) {
    exit;
}


/**
 * CONNECTION PASS STATUS
 *
 * Plugin role:
 * - Owns sponsor profiles, ad campaigns, ad creatives, placements, sponsor access, and sponsor dashboard shell.
 *
 * Current status:
 * - Connection-pass cleanup version.
 * - Analytics numbers are expected from The Words We Carry Analytics, not stored here long-term.
 *
 * Owns:
 * - Sponsors, campaigns, creatives, placements.
 * - Sponsor assignment and limited sponsor dashboard access.
 * - Reader ads REST API.
 *
 * Does not own:
 * - Magazine article/page/chapter content.
 * - Reader display shell or built JS/CSS.
 * - Analytics event table/storage.
 *
 * Connected endpoints:
 * - /wp-json/the-words-we-carry-ads/v1/ads
 * - /wp-json/the-words-we-carry-ads/v1/sponsor-report
 * - Analytics plugin endpoint for future report data: /wp-json/the-words-we-carry-analytics/v1/sponsor-report
 *
 * Public GitHub:
 * - Do not move this plugin source to public GitHub. Private backup/private GitHub only.
 */

final class TWWC_Ads_Sponsors_Plugin {
    const VERSION = '1.0.2';
    const REST_NAMESPACE = 'the-words-we-carry-ads/v1';

    const ROLE_SPONSOR = 'twwc_magazine_sponsor';
    const ROLE_SPONSOR_MANAGER = 'twwc_magazine_sponsor_manager';

    const CPT_SPONSOR = 'twwc_sponsor';
    const CPT_CAMPAIGN = 'twwc_ad_campaign';
    const CPT_CREATIVE = 'twwc_ad_creative';
    const CPT_PLACEMENT = 'twwc_ad_placement';

    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', array($this, 'register_roles'));
        add_action('init', array($this, 'register_post_types'));
        add_action('add_meta_boxes', array($this, 'register_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'), 10, 2);
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_shortcode('twwc_sponsor_dashboard', array($this, 'render_sponsor_dashboard_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'register_frontend_assets'));
        add_filter('manage_' . self::CPT_CAMPAIGN . '_posts_columns', array($this, 'campaign_columns'));
        add_action('manage_' . self::CPT_CAMPAIGN . '_posts_custom_column', array($this, 'render_campaign_column'), 10, 2);
    }

    public function register_roles() {
        add_role(
            self::ROLE_SPONSOR,
            __('Magazine Sponsor', 'the-words-we-carry-ads-sponsors'),
            array(
                'read' => true,
                'twwc_view_own_sponsor_dashboard' => true,
            )
        );

        add_role(
            self::ROLE_SPONSOR_MANAGER,
            __('Magazine Sponsor Manager', 'the-words-we-carry-ads-sponsors'),
            array(
                'read' => true,
                'upload_files' => true,
                'edit_posts' => true,
                'edit_twwc_sponsor' => true,
                'read_twwc_sponsor' => true,
                'delete_twwc_sponsor' => true,
                'edit_twwc_sponsors' => true,
                'edit_others_twwc_sponsors' => true,
                'publish_twwc_sponsors' => true,
                'read_private_twwc_sponsors' => true,
                'edit_twwc_ad_campaign' => true,
                'read_twwc_ad_campaign' => true,
                'delete_twwc_ad_campaign' => true,
                'edit_twwc_ad_campaigns' => true,
                'edit_others_twwc_ad_campaigns' => true,
                'publish_twwc_ad_campaigns' => true,
                'read_private_twwc_ad_campaigns' => true,
                'edit_twwc_ad_creative' => true,
                'read_twwc_ad_creative' => true,
                'delete_twwc_ad_creative' => true,
                'edit_twwc_ad_creatives' => true,
                'edit_others_twwc_ad_creatives' => true,
                'publish_twwc_ad_creatives' => true,
                'read_private_twwc_ad_creatives' => true,
                'edit_twwc_ad_placement' => true,
                'read_twwc_ad_placement' => true,
                'delete_twwc_ad_placement' => true,
                'edit_twwc_ad_placements' => true,
                'edit_others_twwc_ad_placements' => true,
                'publish_twwc_ad_placements' => true,
                'read_private_twwc_ad_placements' => true,
                'twwc_manage_ads_sponsors' => true,
            )
        );

        $admin = get_role('administrator');
        if ($admin) {
            foreach ($this->all_caps() as $cap) {
                $admin->add_cap($cap);
            }
        }
    }

    private function all_caps() {
        return array(
            'edit_twwc_sponsor', 'read_twwc_sponsor', 'delete_twwc_sponsor', 'edit_twwc_sponsors', 'edit_others_twwc_sponsors', 'publish_twwc_sponsors', 'read_private_twwc_sponsors',
            'edit_twwc_ad_campaign', 'read_twwc_ad_campaign', 'delete_twwc_ad_campaign', 'edit_twwc_ad_campaigns', 'edit_others_twwc_ad_campaigns', 'publish_twwc_ad_campaigns', 'read_private_twwc_ad_campaigns',
            'edit_twwc_ad_creative', 'read_twwc_ad_creative', 'delete_twwc_ad_creative', 'edit_twwc_ad_creatives', 'edit_others_twwc_ad_creatives', 'publish_twwc_ad_creatives', 'read_private_twwc_ad_creatives',
            'edit_twwc_ad_placement', 'read_twwc_ad_placement', 'delete_twwc_ad_placement', 'edit_twwc_ad_placements', 'edit_others_twwc_ad_placements', 'publish_twwc_ad_placements', 'read_private_twwc_ad_placements',
            'twwc_manage_ads_sponsors', 'twwc_view_own_sponsor_dashboard',
        );
    }

    public function register_post_types() {
        $this->register_sponsor_post_type();
        $this->register_campaign_post_type();
        $this->register_creative_post_type();
        $this->register_placement_post_type();
    }

    private function register_sponsor_post_type() {
        register_post_type(self::CPT_SPONSOR, array(
            'labels' => array(
                'name' => __('TWWC Sponsors', 'the-words-we-carry-ads-sponsors'),
                'singular_name' => __('Sponsor', 'the-words-we-carry-ads-sponsors'),
                'add_new_item' => __('Add Sponsor', 'the-words-we-carry-ads-sponsors'),
                'edit_item' => __('Edit Sponsor', 'the-words-we-carry-ads-sponsors'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => array('title', 'thumbnail'),
            'capability_type' => array('twwc_sponsor', 'twwc_sponsors'),
            'map_meta_cap' => true,
            'show_in_rest' => false,
        ));
    }

    private function register_campaign_post_type() {
        register_post_type(self::CPT_CAMPAIGN, array(
            'labels' => array(
                'name' => __('TWWC Ad Campaigns', 'the-words-we-carry-ads-sponsors'),
                'singular_name' => __('Ad Campaign', 'the-words-we-carry-ads-sponsors'),
                'add_new_item' => __('Add Ad Campaign', 'the-words-we-carry-ads-sponsors'),
                'edit_item' => __('Edit Ad Campaign', 'the-words-we-carry-ads-sponsors'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => array('title'),
            'capability_type' => array('twwc_ad_campaign', 'twwc_ad_campaigns'),
            'map_meta_cap' => true,
            'show_in_rest' => false,
        ));
    }

    private function register_creative_post_type() {
        register_post_type(self::CPT_CREATIVE, array(
            'labels' => array(
                'name' => __('TWWC Ad Creatives', 'the-words-we-carry-ads-sponsors'),
                'singular_name' => __('Ad Creative', 'the-words-we-carry-ads-sponsors'),
                'add_new_item' => __('Add Ad Creative', 'the-words-we-carry-ads-sponsors'),
                'edit_item' => __('Edit Ad Creative', 'the-words-we-carry-ads-sponsors'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => array('title', 'editor', 'thumbnail'),
            'capability_type' => array('twwc_ad_creative', 'twwc_ad_creatives'),
            'map_meta_cap' => true,
            'show_in_rest' => false,
        ));
    }

    private function register_placement_post_type() {
        register_post_type(self::CPT_PLACEMENT, array(
            'labels' => array(
                'name' => __('TWWC Ad Placements', 'the-words-we-carry-ads-sponsors'),
                'singular_name' => __('Ad Placement', 'the-words-we-carry-ads-sponsors'),
                'add_new_item' => __('Add Ad Placement', 'the-words-we-carry-ads-sponsors'),
                'edit_item' => __('Edit Ad Placement', 'the-words-we-carry-ads-sponsors'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => array('title'),
            'capability_type' => array('twwc_ad_placement', 'twwc_ad_placements'),
            'map_meta_cap' => true,
            'show_in_rest' => false,
        ));
    }

    public function register_admin_menu() {
        add_menu_page(
            __('TWWC Ads', 'the-words-we-carry-ads-sponsors'),
            __('TWWC Ads', 'the-words-we-carry-ads-sponsors'),
            'twwc_manage_ads_sponsors',
            'twwc-ads-sponsors',
            array($this, 'render_dashboard_page'),
            'dashicons-megaphone',
            31
        );

        add_submenu_page('twwc-ads-sponsors', __('Dashboard', 'the-words-we-carry-ads-sponsors'), __('Dashboard', 'the-words-we-carry-ads-sponsors'), 'twwc_manage_ads_sponsors', 'twwc-ads-sponsors', array($this, 'render_dashboard_page'));
        add_submenu_page('twwc-ads-sponsors', __('Sponsors', 'the-words-we-carry-ads-sponsors'), __('Sponsors', 'the-words-we-carry-ads-sponsors'), 'edit_twwc_sponsors', 'edit.php?post_type=' . self::CPT_SPONSOR);
        add_submenu_page('twwc-ads-sponsors', __('Campaigns', 'the-words-we-carry-ads-sponsors'), __('Campaigns', 'the-words-we-carry-ads-sponsors'), 'edit_twwc_ad_campaigns', 'edit.php?post_type=' . self::CPT_CAMPAIGN);
        add_submenu_page('twwc-ads-sponsors', __('Ad Creatives', 'the-words-we-carry-ads-sponsors'), __('Ad Creatives', 'the-words-we-carry-ads-sponsors'), 'edit_twwc_ad_creatives', 'edit.php?post_type=' . self::CPT_CREATIVE);
        add_submenu_page('twwc-ads-sponsors', __('Placements', 'the-words-we-carry-ads-sponsors'), __('Placements', 'the-words-we-carry-ads-sponsors'), 'edit_twwc_ad_placements', 'edit.php?post_type=' . self::CPT_PLACEMENT);
        add_submenu_page('twwc-ads-sponsors', __('Settings', 'the-words-we-carry-ads-sponsors'), __('Settings', 'the-words-we-carry-ads-sponsors'), 'twwc_manage_ads_sponsors', 'twwc-ads-sponsors-settings', array($this, 'render_settings_page'));
    }

    public function register_settings() {
        register_setting('twwc_ads_sponsors_settings', 'twwc_ads_sponsors_options', array(
            'type' => 'array',
            'sanitize_callback' => array($this, 'sanitize_options'),
            'default' => array(
                'default_issue_id' => 'the-words-we-carry-volume-1',
                'sponsor_dashboard_page_id' => 0,
                'enable_public_ads_api' => 1,
            ),
        ));
    }

    public function sanitize_options($input) {
        $input = is_array($input) ? $input : array();
        return array(
            'default_issue_id' => sanitize_text_field($input['default_issue_id'] ?? ''),
            'sponsor_dashboard_page_id' => absint($input['sponsor_dashboard_page_id'] ?? 0),
            'enable_public_ads_api' => !isset($input['enable_public_ads_api']) || !empty($input['enable_public_ads_api']) ? 1 : 0,
        );
    }

    public function register_meta_boxes() {
        add_meta_box('twwc_sponsor_details', __('Sponsor Details', 'the-words-we-carry-ads-sponsors'), array($this, 'render_sponsor_details_box'), self::CPT_SPONSOR, 'normal', 'high');
        add_meta_box('twwc_campaign_details', __('Campaign Details', 'the-words-we-carry-ads-sponsors'), array($this, 'render_campaign_details_box'), self::CPT_CAMPAIGN, 'normal', 'high');
        add_meta_box('twwc_creative_details', __('Ad Creative Details', 'the-words-we-carry-ads-sponsors'), array($this, 'render_creative_details_box'), self::CPT_CREATIVE, 'normal', 'high');
        add_meta_box('twwc_placement_details', __('Placement Details', 'the-words-we-carry-ads-sponsors'), array($this, 'render_placement_details_box'), self::CPT_PLACEMENT, 'normal', 'high');
    }

    public function render_sponsor_details_box($post) {
        wp_nonce_field('twwc_ads_sponsors_save_meta', 'twwc_ads_sponsors_nonce');
        $fields = $this->get_post_meta_array($post->ID, array('website_url', 'contact_name', 'contact_email', 'assigned_user_id', 'notes'));
        $users = get_users(array('role__in' => array(self::ROLE_SPONSOR, self::ROLE_SPONSOR_MANAGER, 'administrator'), 'orderby' => 'display_name'));
        ?>
        <p><label><strong><?php esc_html_e('Sponsor Website URL', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="url" name="twwc_ads_meta[website_url]" value="<?php echo esc_attr($fields['website_url']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Contact Name', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[contact_name]" value="<?php echo esc_attr($fields['contact_name']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Contact Email', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="email" name="twwc_ads_meta[contact_email]" value="<?php echo esc_attr($fields['contact_email']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Assigned Sponsor User', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br>
            <select name="twwc_ads_meta[assigned_user_id]" class="widefat">
                <option value="0"><?php esc_html_e('No assigned user yet', 'the-words-we-carry-ads-sponsors'); ?></option>
                <?php foreach ($users as $user): ?>
                    <option value="<?php echo esc_attr($user->ID); ?>" <?php selected((int) $fields['assigned_user_id'], $user->ID); ?>><?php echo esc_html($user->display_name . ' (' . $user->user_email . ')'); ?></option>
                <?php endforeach; ?>
            </select>
        </p>
        <p><label><strong><?php esc_html_e('Private Notes', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><textarea name="twwc_ads_meta[notes]" class="widefat" rows="4"><?php echo esc_textarea($fields['notes']); ?></textarea></p>
        <?php
    }

    public function render_campaign_details_box($post) {
        wp_nonce_field('twwc_ads_sponsors_save_meta', 'twwc_ads_sponsors_nonce');
        $fields = $this->get_post_meta_array($post->ID, array('sponsor_id', 'issue_id', 'start_date', 'end_date', 'campaign_status', 'utm_source', 'utm_campaign'));
        $sponsors = $this->posts_for_select(self::CPT_SPONSOR);
        ?>
        <p><label><strong><?php esc_html_e('Sponsor', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><?php $this->render_post_select('twwc_ads_meta[sponsor_id]', $fields['sponsor_id'], $sponsors, __('Select sponsor', 'the-words-we-carry-ads-sponsors')); ?></p>
        <p><label><strong><?php esc_html_e('Issue ID', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[issue_id]" value="<?php echo esc_attr($fields['issue_id']); ?>" class="widefat" placeholder="the-words-we-carry-volume-1"></p>
        <p><label><strong><?php esc_html_e('Start Date', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="date" name="twwc_ads_meta[start_date]" value="<?php echo esc_attr($fields['start_date']); ?>"></p>
        <p><label><strong><?php esc_html_e('End Date', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="date" name="twwc_ads_meta[end_date]" value="<?php echo esc_attr($fields['end_date']); ?>"></p>
        <p><label><strong><?php esc_html_e('Campaign Status', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br>
            <select name="twwc_ads_meta[campaign_status]">
                <?php foreach (array('draft', 'pending', 'active', 'paused', 'ended') as $status): ?>
                    <option value="<?php echo esc_attr($status); ?>" <?php selected($fields['campaign_status'] ?: 'draft', $status); ?>><?php echo esc_html(ucfirst($status)); ?></option>
                <?php endforeach; ?>
            </select>
        </p>
        <p><label><strong><?php esc_html_e('UTM Source', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[utm_source]" value="<?php echo esc_attr($fields['utm_source']); ?>" class="widefat" placeholder="the-words-we-carry"></p>
        <p><label><strong><?php esc_html_e('UTM Campaign', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[utm_campaign]" value="<?php echo esc_attr($fields['utm_campaign']); ?>" class="widefat"></p>
        <?php
    }

    public function render_creative_details_box($post) {
        wp_nonce_field('twwc_ads_sponsors_save_meta', 'twwc_ads_sponsors_nonce');
        $fields = $this->get_post_meta_array($post->ID, array('campaign_id', 'creative_type', 'headline', 'subheadline', 'cta_text', 'cta_url', 'image_id', 'video_url', 'audio_url', 'alt_text', 'sponsor_disclosure'));
        $campaigns = $this->posts_for_select(self::CPT_CAMPAIGN);
        ?>
        <p><label><strong><?php esc_html_e('Campaign', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><?php $this->render_post_select('twwc_ads_meta[campaign_id]', $fields['campaign_id'], $campaigns, __('Select campaign', 'the-words-we-carry-ads-sponsors')); ?></p>
        <p><label><strong><?php esc_html_e('Creative Type', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br>
            <select name="twwc_ads_meta[creative_type]">
                <?php foreach (array('full_page', 'half_page', 'sponsor_page', 'video', 'podcast', 'button', 'image') as $type): ?>
                    <option value="<?php echo esc_attr($type); ?>" <?php selected($fields['creative_type'] ?: 'full_page', $type); ?>><?php echo esc_html(str_replace('_', ' ', ucwords($type, '_'))); ?></option>
                <?php endforeach; ?>
            </select>
        </p>
        <p><label><strong><?php esc_html_e('Headline', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[headline]" value="<?php echo esc_attr($fields['headline']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Subheadline', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[subheadline]" value="<?php echo esc_attr($fields['subheadline']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('CTA Text', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[cta_text]" value="<?php echo esc_attr($fields['cta_text']); ?>" class="widefat" placeholder="Learn More"></p>
        <p><label><strong><?php esc_html_e('CTA URL', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="url" name="twwc_ads_meta[cta_url]" value="<?php echo esc_attr($fields['cta_url']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('WordPress Media Image ID', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="number" name="twwc_ads_meta[image_id]" value="<?php echo esc_attr($fields['image_id']); ?>" class="widefat" min="0"><span class="description"><?php esc_html_e('Upload/select image in Media Library, then paste the attachment ID here for now.', 'the-words-we-carry-ads-sponsors'); ?></span></p>
        <p><label><strong><?php esc_html_e('Video URL / Embed URL', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="url" name="twwc_ads_meta[video_url]" value="<?php echo esc_attr($fields['video_url']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Audio / Podcast URL', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="url" name="twwc_ads_meta[audio_url]" value="<?php echo esc_attr($fields['audio_url']); ?>" class="widefat"></p>
        <p><label><strong><?php esc_html_e('Alt Text / Accessibility Label', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><textarea name="twwc_ads_meta[alt_text]" class="widefat" rows="3"><?php echo esc_textarea($fields['alt_text']); ?></textarea></p>
        <p><label><strong><?php esc_html_e('Sponsor Disclosure', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[sponsor_disclosure]" value="<?php echo esc_attr($fields['sponsor_disclosure']); ?>" class="widefat" placeholder="Sponsored placement"></p>
        <?php
    }

    public function render_placement_details_box($post) {
        wp_nonce_field('twwc_ads_sponsors_save_meta', 'twwc_ads_sponsors_nonce');
        $fields = $this->get_post_meta_array($post->ID, array('creative_id', 'issue_id', 'placement_rule', 'target_id', 'page_id', 'placement_order', 'enabled'));
        $creatives = $this->posts_for_select(self::CPT_CREATIVE);
        ?>
        <p><label><strong><?php esc_html_e('Ad Creative', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><?php $this->render_post_select('twwc_ads_meta[creative_id]', $fields['creative_id'], $creatives, __('Select creative', 'the-words-we-carry-ads-sponsors')); ?></p>
        <p><label><strong><?php esc_html_e('Issue ID', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[issue_id]" value="<?php echo esc_attr($fields['issue_id']); ?>" class="widefat" placeholder="the-words-we-carry-volume-1"></p>
        <p><label><strong><?php esc_html_e('Placement Rule', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br>
            <select name="twwc_ads_meta[placement_rule]">
                <?php foreach (array('before', 'after', 'between_chapters', 'before_back_matter', 'after_share_page', 'fixed_page') as $rule): ?>
                    <option value="<?php echo esc_attr($rule); ?>" <?php selected($fields['placement_rule'] ?: 'after', $rule); ?>><?php echo esc_html(str_replace('_', ' ', ucwords($rule, '_'))); ?></option>
                <?php endforeach; ?>
            </select>
        </p>
        <p><label><strong><?php esc_html_e('Target ID', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[target_id]" value="<?php echo esc_attr($fields['target_id']); ?>" class="widefat" placeholder="article-id, chapter-id, page-id"></p>
        <p><label><strong><?php esc_html_e('Reader Page ID', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="text" name="twwc_ads_meta[page_id]" value="<?php echo esc_attr($fields['page_id']); ?>" class="widefat" placeholder="sponsor-ad-example-001"></p>
        <p><label><strong><?php esc_html_e('Order', 'the-words-we-carry-ads-sponsors'); ?></strong></label><br><input type="number" name="twwc_ads_meta[placement_order]" value="<?php echo esc_attr($fields['placement_order'] ?: 0); ?>" min="0"></p>
        <p><label><input type="checkbox" name="twwc_ads_meta[enabled]" value="1" <?php checked($fields['enabled'], '1'); ?>> <?php esc_html_e('Placement enabled', 'the-words-we-carry-ads-sponsors'); ?></label></p>
        <?php
    }

    public function save_meta_boxes($post_id, $post) {
        if (!in_array($post->post_type, array(self::CPT_SPONSOR, self::CPT_CAMPAIGN, self::CPT_CREATIVE, self::CPT_PLACEMENT), true)) {
            return;
        }
        if (!isset($_POST['twwc_ads_sponsors_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['twwc_ads_sponsors_nonce'])), 'twwc_ads_sponsors_save_meta')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $raw = isset($_POST['twwc_ads_meta']) && is_array($_POST['twwc_ads_meta']) ? wp_unslash($_POST['twwc_ads_meta']) : array();
        $allowed = array(
            'website_url' => 'url', 'contact_name' => 'text', 'contact_email' => 'email', 'assigned_user_id' => 'int', 'notes' => 'textarea',
            'sponsor_id' => 'int', 'issue_id' => 'key', 'start_date' => 'date', 'end_date' => 'date', 'campaign_status' => 'key', 'utm_source' => 'text', 'utm_campaign' => 'text',
            'campaign_id' => 'int', 'creative_type' => 'key', 'headline' => 'text', 'subheadline' => 'text', 'cta_text' => 'text', 'cta_url' => 'url', 'image_id' => 'int', 'video_url' => 'url', 'audio_url' => 'url', 'alt_text' => 'textarea', 'sponsor_disclosure' => 'text',
            'creative_id' => 'int', 'placement_rule' => 'key', 'target_id' => 'key', 'page_id' => 'key', 'placement_order' => 'int', 'enabled' => 'bool',
        );

        foreach ($allowed as $key => $type) {
            $value = $raw[$key] ?? '';
            switch ($type) {
                case 'url': $value = esc_url_raw($value); break;
                case 'email': $value = sanitize_email($value); break;
                case 'int': $value = absint($value); break;
                case 'textarea': $value = sanitize_textarea_field($value); break;
                case 'date': $value = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $value) ? $value : ''; break;
                case 'bool': $value = !empty($value) ? '1' : '0'; break;
                case 'key': $value = sanitize_key(str_replace('-', '_', (string) $value)); break;
                default: $value = sanitize_text_field($value); break;
            }
            update_post_meta($post_id, '_twwc_' . $key, $value);
        }

        if ($post->post_type === self::CPT_SPONSOR && !empty($raw['assigned_user_id'])) {
            update_user_meta(absint($raw['assigned_user_id']), '_twwc_sponsor_id', $post_id);
        }
    }

    private function get_post_meta_array($post_id, $keys) {
        $out = array();
        foreach ($keys as $key) {
            $out[$key] = get_post_meta($post_id, '_twwc_' . $key, true);
        }
        return $out;
    }

    private function posts_for_select($post_type) {
        return get_posts(array(
            'post_type' => $post_type,
            'post_status' => array('publish', 'draft', 'private', 'pending'),
            'numberposts' => 500,
            'orderby' => 'title',
            'order' => 'ASC',
        ));
    }

    private function render_post_select($name, $selected, $posts, $placeholder) {
        echo '<select name="' . esc_attr($name) . '" class="widefat">';
        echo '<option value="0">' . esc_html($placeholder) . '</option>';
        foreach ($posts as $post) {
            echo '<option value="' . esc_attr($post->ID) . '" ' . selected((int) $selected, $post->ID, false) . '>' . esc_html($post->post_title) . '</option>';
        }
        echo '</select>';
    }

    public function register_rest_routes() {
        register_rest_route(self::REST_NAMESPACE, '/ads', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_ads'),
            'permission_callback' => array($this, 'can_read_public_ads'),
            'args' => array(
                'issue_id' => array('sanitize_callback' => 'sanitize_text_field'),
            ),
        ));

        register_rest_route(self::REST_NAMESPACE, '/sponsor-report', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_sponsor_report'),
            'permission_callback' => array($this, 'can_view_sponsor_report'),
        ));
    }

    public function can_read_public_ads() {
        // Public reader ads endpoint should not block the magazine if no ads are configured.
        // It returns an empty ads array when there are no active placements.
        return true;
    }

    public function can_view_sponsor_report() {
        return is_user_logged_in() && (current_user_can('twwc_view_own_sponsor_dashboard') || current_user_can('twwc_manage_ads_sponsors'));
    }

    public function rest_get_ads($request) {
        $issue_id = sanitize_text_field($request->get_param('issue_id'));
        if (!$issue_id) {
            $options = get_option('twwc_ads_sponsors_options', array());
            $issue_id = sanitize_text_field($options['default_issue_id'] ?? '');
        }
        return rest_ensure_response(array(
            'version' => self::VERSION,
            'issueId' => $issue_id,
            'ads' => $this->get_active_placements($issue_id),
        ));
    }

    private function get_active_placements($issue_id = '') {
        $placements = get_posts(array(
            'post_type' => self::CPT_PLACEMENT,
            'post_status' => 'publish',
            'numberposts' => 500,
            'meta_key' => '_twwc_placement_order',
            'orderby' => 'meta_value_num',
            'order' => 'ASC',
        ));

        $out = array();
        foreach ($placements as $placement) {
            if (get_post_meta($placement->ID, '_twwc_enabled', true) !== '1') {
                continue;
            }
            $placement_issue_id = get_post_meta($placement->ID, '_twwc_issue_id', true);
            if ($issue_id && $placement_issue_id && $placement_issue_id !== $issue_id) {
                continue;
            }
            $creative_id = absint(get_post_meta($placement->ID, '_twwc_creative_id', true));
            if (!$creative_id || get_post_status($creative_id) !== 'publish') {
                continue;
            }
            $campaign_id = absint(get_post_meta($creative_id, '_twwc_campaign_id', true));
            if (!$campaign_id || !$this->campaign_is_active($campaign_id)) {
                continue;
            }
            $sponsor_id = absint(get_post_meta($campaign_id, '_twwc_sponsor_id', true));
            $image_id = absint(get_post_meta($creative_id, '_twwc_image_id', true));

            $out[] = array(
                'id' => 'ad-' . $creative_id,
                'type' => 'ad',
                'source' => 'wordpress',
                'sponsorId' => $sponsor_id ? 'sponsor-' . $sponsor_id : '',
                'campaignId' => 'campaign-' . $campaign_id,
                'adId' => 'creative-' . $creative_id,
                'placementId' => 'placement-' . $placement->ID,
                'issueId' => $placement_issue_id ?: $issue_id,
                'pageId' => get_post_meta($placement->ID, '_twwc_page_id', true) ?: 'ad-' . $creative_id,
                'title' => get_the_title($creative_id),
                'headline' => get_post_meta($creative_id, '_twwc_headline', true),
                'subheadline' => get_post_meta($creative_id, '_twwc_subheadline', true),
                'body' => wp_kses_post(get_post_field('post_content', $creative_id)),
                'creativeType' => get_post_meta($creative_id, '_twwc_creative_type', true) ?: 'full_page',
                'imageUrl' => $image_id ? wp_get_attachment_image_url($image_id, 'large') : '',
                'imageId' => $image_id,
                'altText' => get_post_meta($creative_id, '_twwc_alt_text', true),
                'ctaText' => get_post_meta($creative_id, '_twwc_cta_text', true),
                'ctaUrl' => $this->append_campaign_utm(get_post_meta($creative_id, '_twwc_cta_url', true), $campaign_id),
                'videoUrl' => get_post_meta($creative_id, '_twwc_video_url', true),
                'audioUrl' => get_post_meta($creative_id, '_twwc_audio_url', true),
                'sponsorDisclosure' => get_post_meta($creative_id, '_twwc_sponsor_disclosure', true) ?: 'Sponsored placement',
                'placement' => array(
                    'rule' => get_post_meta($placement->ID, '_twwc_placement_rule', true) ?: 'after',
                    'targetId' => get_post_meta($placement->ID, '_twwc_target_id', true),
                    'order' => absint(get_post_meta($placement->ID, '_twwc_placement_order', true)),
                ),
            );
        }
        return $out;
    }

    private function campaign_is_active($campaign_id) {
        $status = get_post_meta($campaign_id, '_twwc_campaign_status', true);
        if ($status !== 'active') {
            return false;
        }
        $today = current_time('Y-m-d');
        $start = get_post_meta($campaign_id, '_twwc_start_date', true);
        $end = get_post_meta($campaign_id, '_twwc_end_date', true);
        if ($start && $today < $start) {
            return false;
        }
        if ($end && $today > $end) {
            return false;
        }
        return true;
    }

    private function append_campaign_utm($url, $campaign_id) {
        $url = esc_url_raw($url);
        if (!$url) {
            return '';
        }
        $source = get_post_meta($campaign_id, '_twwc_utm_source', true);
        $campaign = get_post_meta($campaign_id, '_twwc_utm_campaign', true);
        if ($source) {
            $url = add_query_arg('utm_source', rawurlencode($source), $url);
        }
        if ($campaign) {
            $url = add_query_arg('utm_campaign', rawurlencode($campaign), $url);
        }
        return $url;
    }

    public function rest_get_sponsor_report($request) {
        $sponsor_id = $this->current_user_sponsor_id();
        if (current_user_can('twwc_manage_ads_sponsors') && $request->get_param('sponsor_id')) {
            $sponsor_id = absint($request->get_param('sponsor_id'));
        }
        if (!$sponsor_id) {
            return new WP_Error('twwc_no_sponsor', __('No sponsor profile is assigned to this user.', 'the-words-we-carry-ads-sponsors'), array('status' => 403));
        }

        $campaigns = $this->get_campaigns_for_sponsor($sponsor_id);
        $campaign_ids = wp_list_pluck($campaigns, 'ID');
        $analytics = apply_filters('twwc_analytics_get_sponsor_report', array(
            'available' => false,
            'message' => __('Analytics plugin is not active yet. Campaign structure is ready; tracking/reports will activate after Step 4.', 'the-words-we-carry-ads-sponsors'),
            'totals' => array('impressions' => 0, 'clicks' => 0, 'ctr' => 0),
            'campaigns' => array(),
        ), $sponsor_id, $campaign_ids);

        return rest_ensure_response(array(
            'sponsorId' => $sponsor_id,
            'sponsorName' => get_the_title($sponsor_id),
            'campaigns' => array_map(array($this, 'format_campaign_for_report'), $campaigns),
            'analytics' => $analytics,
        ));
    }

    private function current_user_sponsor_id() {
        return absint(get_user_meta(get_current_user_id(), '_twwc_sponsor_id', true));
    }

    private function get_campaigns_for_sponsor($sponsor_id) {
        return get_posts(array(
            'post_type' => self::CPT_CAMPAIGN,
            'post_status' => array('publish', 'draft', 'private', 'pending'),
            'numberposts' => 500,
            'meta_query' => array(
                array(
                    'key' => '_twwc_sponsor_id',
                    'value' => absint($sponsor_id),
                    'compare' => '=',
                ),
            ),
        ));
    }

    public function format_campaign_for_report($campaign) {
        return array(
            'id' => $campaign->ID,
            'title' => get_the_title($campaign),
            'issueId' => get_post_meta($campaign->ID, '_twwc_issue_id', true),
            'startDate' => get_post_meta($campaign->ID, '_twwc_start_date', true),
            'endDate' => get_post_meta($campaign->ID, '_twwc_end_date', true),
            'status' => get_post_meta($campaign->ID, '_twwc_campaign_status', true) ?: 'draft',
        );
    }

    public function render_dashboard_page() {
        if (!current_user_can('twwc_manage_ads_sponsors')) {
            wp_die(esc_html__('You do not have permission to view this page.', 'the-words-we-carry-ads-sponsors'));
        }
        $counts = array(
            'Sponsors' => wp_count_posts(self::CPT_SPONSOR),
            'Campaigns' => wp_count_posts(self::CPT_CAMPAIGN),
            'Creatives' => wp_count_posts(self::CPT_CREATIVE),
            'Placements' => wp_count_posts(self::CPT_PLACEMENT),
        );
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('The Words We Carry Ads & Sponsors', 'the-words-we-carry-ads-sponsors'); ?></h1>
            <p><?php esc_html_e('This plugin owns sponsor profiles, campaigns, ad creatives, placements, and sponsor-facing access. Analytics storage/reporting will be connected by the separate Analytics Plugin.', 'the-words-we-carry-ads-sponsors'); ?></p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;max-width:900px;">
                <?php foreach ($counts as $label => $count_obj): ?>
                    <div style="background:#fff;border:1px solid #dcdcde;padding:16px;border-radius:8px;">
                        <strong><?php echo esc_html($label); ?></strong>
                        <div style="font-size:28px;margin-top:8px;"><?php echo esc_html((int) ($count_obj->publish ?? 0)); ?></div>
                        <small><?php esc_html_e('published', 'the-words-we-carry-ads-sponsors'); ?></small>
                    </div>
                <?php endforeach; ?>
            </div>
            <h2><?php esc_html_e('Sponsor dashboard shortcode', 'the-words-we-carry-ads-sponsors'); ?></h2>
            <code>[twwc_sponsor_dashboard]</code>
        </div>
        <?php
    }

    public function render_settings_page() {
        if (!current_user_can('twwc_manage_ads_sponsors')) {
            wp_die(esc_html__('You do not have permission to view this page.', 'the-words-we-carry-ads-sponsors'));
        }
        $options = get_option('twwc_ads_sponsors_options', array());
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('TWWC Ads & Sponsors Settings', 'the-words-we-carry-ads-sponsors'); ?></h1>
            <form method="post" action="options.php">
                <?php settings_fields('twwc_ads_sponsors_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="default_issue_id"><?php esc_html_e('Default Issue ID', 'the-words-we-carry-ads-sponsors'); ?></label></th>
                        <td><input type="text" id="default_issue_id" name="twwc_ads_sponsors_options[default_issue_id]" value="<?php echo esc_attr($options['default_issue_id'] ?? ''); ?>" class="regular-text" placeholder="the-words-we-carry-volume-1"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="sponsor_dashboard_page_id"><?php esc_html_e('Sponsor Dashboard Page ID', 'the-words-we-carry-ads-sponsors'); ?></label></th>
                        <td><input type="number" id="sponsor_dashboard_page_id" name="twwc_ads_sponsors_options[sponsor_dashboard_page_id]" value="<?php echo esc_attr(absint($options['sponsor_dashboard_page_id'] ?? 0)); ?>" class="small-text"></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Public Ads API', 'the-words-we-carry-ads-sponsors'); ?></th>
                        <td><label><input type="checkbox" name="twwc_ads_sponsors_options[enable_public_ads_api]" value="1" <?php checked(!empty($options['enable_public_ads_api'])); ?>> <?php esc_html_e('Allow the reader to fetch active ads without login.', 'the-words-we-carry-ads-sponsors'); ?></label></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function render_sponsor_dashboard_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<div class="twwc-sponsor-dashboard"><p>Please log in to view your sponsor dashboard.</p></div>';
        }
        if (!current_user_can('twwc_view_own_sponsor_dashboard') && !current_user_can('twwc_manage_ads_sponsors')) {
            return '<div class="twwc-sponsor-dashboard"><p>Your account does not have sponsor dashboard access.</p></div>';
        }

        $sponsor_id = $this->current_user_sponsor_id();
        if (!$sponsor_id && !current_user_can('twwc_manage_ads_sponsors')) {
            return '<div class="twwc-sponsor-dashboard"><p>No sponsor profile is assigned to this account yet.</p></div>';
        }

        $campaigns = $sponsor_id ? $this->get_campaigns_for_sponsor($sponsor_id) : array();
        $analytics = apply_filters('twwc_analytics_get_sponsor_report', array(
            'available' => false,
            'message' => __('Analytics plugin is not active yet. Tracking/reports will activate after Step 4.', 'the-words-we-carry-ads-sponsors'),
            'totals' => array('impressions' => 0, 'clicks' => 0, 'ctr' => 0),
            'campaigns' => array(),
        ), $sponsor_id, wp_list_pluck($campaigns, 'ID'));

        ob_start();
        ?>
        <div class="twwc-sponsor-dashboard" style="border:1px solid #ddd;padding:20px;border-radius:10px;">
            <h2><?php echo esc_html(get_the_title($sponsor_id) ?: __('Sponsor Dashboard', 'the-words-we-carry-ads-sponsors')); ?></h2>
            <p><?php echo esc_html($analytics['message'] ?? ''); ?></p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0;">
                <div><strong><?php esc_html_e('Impressions', 'the-words-we-carry-ads-sponsors'); ?></strong><br><?php echo esc_html((int) ($analytics['totals']['impressions'] ?? 0)); ?></div>
                <div><strong><?php esc_html_e('Clicks', 'the-words-we-carry-ads-sponsors'); ?></strong><br><?php echo esc_html((int) ($analytics['totals']['clicks'] ?? 0)); ?></div>
                <div><strong><?php esc_html_e('CTR', 'the-words-we-carry-ads-sponsors'); ?></strong><br><?php echo esc_html($analytics['totals']['ctr'] ?? 0); ?>%</div>
            </div>
            <h3><?php esc_html_e('Campaigns', 'the-words-we-carry-ads-sponsors'); ?></h3>
            <?php if ($campaigns): ?>
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr><th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Campaign</th><th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Status</th><th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Dates</th></tr></thead>
                    <tbody>
                    <?php foreach ($campaigns as $campaign): ?>
                        <tr>
                            <td style="border-bottom:1px solid #eee;padding:8px;"><?php echo esc_html(get_the_title($campaign)); ?></td>
                            <td style="border-bottom:1px solid #eee;padding:8px;"><?php echo esc_html(get_post_meta($campaign->ID, '_twwc_campaign_status', true) ?: 'draft'); ?></td>
                            <td style="border-bottom:1px solid #eee;padding:8px;"><?php echo esc_html(trim(get_post_meta($campaign->ID, '_twwc_start_date', true) . ' - ' . get_post_meta($campaign->ID, '_twwc_end_date', true), ' -')); ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p><?php esc_html_e('No campaigns are assigned yet.', 'the-words-we-carry-ads-sponsors'); ?></p>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public function register_frontend_assets() {
        // Placeholder for later sponsor dashboard CSS/JS. Kept empty to keep this plugin light.
    }

    public function campaign_columns($columns) {
        $columns['twwc_sponsor'] = __('Sponsor', 'the-words-we-carry-ads-sponsors');
        $columns['twwc_status'] = __('Campaign Status', 'the-words-we-carry-ads-sponsors');
        $columns['twwc_dates'] = __('Dates', 'the-words-we-carry-ads-sponsors');
        return $columns;
    }

    public function render_campaign_column($column, $post_id) {
        if ($column === 'twwc_sponsor') {
            $sponsor_id = absint(get_post_meta($post_id, '_twwc_sponsor_id', true));
            echo esc_html($sponsor_id ? get_the_title($sponsor_id) : '—');
        }
        if ($column === 'twwc_status') {
            echo esc_html(get_post_meta($post_id, '_twwc_campaign_status', true) ?: 'draft');
        }
        if ($column === 'twwc_dates') {
            echo esc_html(trim(get_post_meta($post_id, '_twwc_start_date', true) . ' - ' . get_post_meta($post_id, '_twwc_end_date', true), ' -') ?: '—');
        }
    }

    public static function activate() {
        self::instance()->register_roles();
        self::instance()->register_post_types();
        flush_rewrite_rules();
    }

    public static function deactivate() {
        flush_rewrite_rules();
    }
}

register_activation_hook(__FILE__, array('TWWC_Ads_Sponsors_Plugin', 'activate'));
register_deactivation_hook(__FILE__, array('TWWC_Ads_Sponsors_Plugin', 'deactivate'));
TWWC_Ads_Sponsors_Plugin::instance();
