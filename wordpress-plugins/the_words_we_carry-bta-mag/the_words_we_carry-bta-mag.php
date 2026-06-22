<?php
/**
 * Plugin Name: The Words We Carry BTA Mag
 * Plugin URI:  https://breathtakingawareness.com/
 * Description: Renamed lightweight display shell for The Words We Carry / BTA magazine reader. Loads the reader assets and connects to separate content, ads, and analytics plugins/endpoints.
 * Version:     3.1.5
 * Author:      Breathtaking Awareness
 * License:     GPL-2.0+
 * Text Domain: the-words-we-carry-bta-mag
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}


/**
 * CONNECTION PASS STATUS
 *
 * Plugin role:
 * - Display-only shell for The Words We Carry reader.
 * - Owns shortcode/block rendering, reader asset loading, and endpoint settings.
 *
 * Current status:
 * - Connection-pass cleanup version.
 * - Keep this plugin boring. Do not add articles, ads, sponsors, analytics tables, or content-editing UI here.
 *
 * Owns:
 * - [the_words_we_carry-bta-mag] and [twwc_reader] shortcodes.
 * - the-words-we-carry/reader block render callback.
 * - Built reader JS/CSS enqueue.
 * - Reader settings passed to JavaScript.
 *
 * Does not own:
 * - Magazine article/page/chapter data. That belongs to The Words We Carry Magazine Content.
 * - Ad/sponsor/campaign records. That belongs to The Words We Carry Ads & Sponsors.
 * - Event storage/reports. That belongs to The Words We Carry Analytics.
 *
 * Connected endpoints:
 * - Primary content: /wp-json/the-words-we-carry-content/v1/magazine
 * - Ads: /wp-json/the-words-we-carry-ads/v1/ads
 * - Analytics event: /wp-json/the-words-we-carry-analytics/v1/event
 * - LEGACY FALLBACK — remove after Magazine Content Plugin endpoint is verified in production.
 * - Built-in/local fallback remains emergency only.
 *
 * Public GitHub:
 * - Do not move this plugin source to public GitHub. Private backup/private GitHub only.
 */

define( 'TWWC_BTA_MAG_READER_DISPLAY_VERSION', '3.1.5' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'TWWC_BTA_MAG_READER_DISPLAY_SCRIPT_HANDLE', 'the-words-we-carry-bta-mag-script' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_STYLE_HANDLE', 'the-words-we-carry-bta-mag-style' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_OPTION_KEY', 'twwc_bta_mag_reader_display_settings' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_PRIMARY_CONTENT_ENDPOINT', 'the-words-we-carry-content/v1/magazine' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_ADS_ENDPOINT', 'the-words-we-carry-ads/v1/ads' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_ANALYTICS_ENDPOINT', 'the-words-we-carry-analytics/v1/event' );
define( 'TWWC_BTA_MAG_READER_DISPLAY_LEGACY_CONTENT_ENDPOINT', 'the-words-we-carry/v1/magazine' ); // LEGACY FALLBACK — remove after production verification.

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_BASE_RAW_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_ISSUE_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CONFIG_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_MAGAZINE_MANIFEST_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_ARTICLES_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CHAPTERS_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_FRONT_MATTER_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

define(
	'TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CHAPTER_DESCRIPTIONS_URL',
	'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json'
);

add_action( 'admin_init', 'twwc_bta_mag_reader_display_register_settings' );
add_action( 'admin_menu', 'twwc_bta_mag_reader_display_register_settings_page' );
add_action( 'init', 'twwc_bta_mag_reader_display_register_block' );
add_shortcode( 'the_words_we_carry-bta-mag', 'twwc_bta_mag_reader_display_shortcode' );
add_shortcode( 'twwc_reader', 'twwc_bta_mag_reader_display_shortcode' );

/**
 * Default settings for the display-only plugin.
 *
 * This plugin intentionally does not create articles, ads, sponsors, or analytics tables.
 * Those belong in separate plugins:
 * - Magazine Content Plugin
 * - Ads/Sponsors Plugin
 * - Analytics Plugin
 */
function twwc_bta_mag_reader_display_default_settings() {
	return array(
		'default_height'           => '100svh',
		'issue_url'                => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_ISSUE_URL,
		'content_api_url'          => rest_url( TWWC_BTA_MAG_READER_DISPLAY_PRIMARY_CONTENT_ENDPOINT ),
		'ads_api_url'              => rest_url( TWWC_BTA_MAG_READER_DISPLAY_ADS_ENDPOINT ),
		'analytics_api_url'        => rest_url( TWWC_BTA_MAG_READER_DISPLAY_ANALYTICS_ENDPOINT ),
		'legacy_content_api_url'   => '',
		'config_url'               => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CONFIG_URL,
		'magazine_manifest_url'    => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_MAGAZINE_MANIFEST_URL,
		'articles_url'             => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_ARTICLES_URL,
		'chapters_url'             => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CHAPTERS_URL,
		'front_matter_url'         => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_FRONT_MATTER_URL,
		'chapter_descriptions_url' => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_CHAPTER_DESCRIPTIONS_URL,
		'base_raw_url'             => TWWC_BTA_MAG_READER_DISPLAY_DEFAULT_BASE_RAW_URL,
		'copyright_owner'          => 'Jolie Lizana / Breathtaking Awareness',
		'permissions_email'        => 'Jolie@BreathtakingAwareness.com',
		'license_label'            => 'All rights reserved',
	);
}

function twwc_bta_mag_reader_display_get_settings() {
	$saved = get_option( TWWC_BTA_MAG_READER_DISPLAY_OPTION_KEY, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}

	$settings = wp_parse_args( $saved, twwc_bta_mag_reader_display_default_settings() );

	// The old public content/magazine-manifest.json file no longer exists.
	// Route that legacy setting to the current issue.json to avoid a frontend 404.
	if ( ! empty( $settings['magazine_manifest_url'] ) && false !== strpos( $settings['magazine_manifest_url'], '/content/magazine-manifest.json' ) ) {
		$settings['magazine_manifest_url'] = $settings['issue_url'];
	}

	return $settings;
}

function twwc_bta_mag_reader_display_register_settings() {
	register_setting(
		'twwc_bta_mag_reader_display_settings_group',
		TWWC_BTA_MAG_READER_DISPLAY_OPTION_KEY,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'twwc_bta_mag_reader_display_sanitize_settings',
			'default'           => twwc_bta_mag_reader_display_default_settings(),
		)
	);
}

function twwc_bta_mag_reader_display_sanitize_settings( $input ) {
	$defaults = twwc_bta_mag_reader_display_default_settings();
	$input    = is_array( $input ) ? $input : array();
	$output   = array();

	$url_keys = array(
		'issue_url',
		'content_api_url',
		'ads_api_url',
		'analytics_api_url',
		'legacy_content_api_url',
		'config_url',
		'magazine_manifest_url',
		'articles_url',
		'chapters_url',
		'front_matter_url',
		'chapter_descriptions_url',
		'base_raw_url',
	);

	foreach ( $defaults as $key => $default ) {
		$value = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : $default;

		if ( 'default_height' === $key ) {
			$output[ $key ] = twwc_bta_mag_reader_display_sanitize_css_size( $value, $default );
			continue;
		}

		if ( in_array( $key, $url_keys, true ) ) {
			$output[ $key ] = '' === trim( (string) $value ) ? '' : esc_url_raw( $value );
			continue;
		}

		if ( 'permissions_email' === $key ) {
			$output[ $key ] = sanitize_email( $value );
			continue;
		}

		$output[ $key ] = sanitize_text_field( $value );
	}

	return $output;
}

function twwc_bta_mag_reader_display_register_settings_page() {
	add_options_page(
		'The Words We Carry Reader',
		'TWWC BTA Mag',
		'manage_options',
		'twwc-reader-display',
		'twwc_bta_mag_reader_display_render_settings_page'
	);
}

function twwc_bta_mag_reader_display_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$settings = twwc_bta_mag_reader_display_get_settings();
	$key      = TWWC_BTA_MAG_READER_DISPLAY_OPTION_KEY;
	?>
	<div class="wrap">
		<h1>The Words We Carry BTA Mag</h1>
		<p>This plugin is intentionally lightweight. It displays the reader and points it to separate content, ads/sponsors, and analytics systems.</p>

		<form method="post" action="options.php">
			<?php settings_fields( 'twwc_bta_mag_reader_display_settings_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="twwc_default_height">Default reader height</label></th>
					<td>
						<input id="twwc_default_height" class="regular-text" name="<?php echo esc_attr( $key ); ?>[default_height]" value="<?php echo esc_attr( $settings['default_height'] ); ?>" />
						<p class="description">Example: 86svh, 100svh, 720px, clamp(620px, 86svh, 920px).</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="twwc_issue_url">GitHub issue.json URL</label></th>
					<td>
						<input id="twwc_issue_url" class="large-text code" name="<?php echo esc_attr( $key ); ?>[issue_url]" value="<?php echo esc_attr( $settings['issue_url'] ); ?>" />
						<p class="description">Primary magazine source of truth. Default: Joliel21/bta_public public/content/issue.json</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="twwc_content_api_url">Magazine Content API URL</label></th>
					<td>
						<input id="twwc_content_api_url" class="large-text code" name="<?php echo esc_attr( $key ); ?>[content_api_url]" value="<?php echo esc_attr( $settings['content_api_url'] ); ?>" />
						<p class="description">Default uses the Magazine Content Plugin endpoint. This supplies WordPress article text/images while GitHub issue.json controls structure.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="twwc_legacy_content_api_url">Legacy content API URL</label></th>
					<td>
						<input id="twwc_legacy_content_api_url" class="large-text code" name="<?php echo esc_attr( $key ); ?>[legacy_content_api_url]" value="<?php echo esc_attr( $settings['legacy_content_api_url'] ); ?>" />
						<p class="description"><strong>LEGACY FALLBACK — remove after Magazine Content Plugin endpoint is verified in production.</strong> This is not the final architecture.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="twwc_ads_api_url">Ads/Sponsors API URL</label></th>
					<td>
						<input id="twwc_ads_api_url" class="large-text code" name="<?php echo esc_attr( $key ); ?>[ads_api_url]" value="<?php echo esc_attr( $settings['ads_api_url'] ); ?>" />
						<p class="description">Reserved for the separate Ads/Sponsors Plugin. The reader can receive this config before ads are wired into the React app.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="twwc_analytics_api_url">Analytics API URL</label></th>
					<td>
						<input id="twwc_analytics_api_url" class="large-text code" name="<?php echo esc_attr( $key ); ?>[analytics_api_url]" value="<?php echo esc_attr( $settings['analytics_api_url'] ); ?>" />
						<p class="description">Leave blank until the Analytics Plugin is installed. Suggested future endpoint: /wp-json/the-words-we-carry-analytics/v1/event</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Fallback URLs</th>
					<td>
						<label>Publish manifest/config URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[config_url]" value="<?php echo esc_attr( $settings['config_url'] ); ?>" /></label><br><br>
						<label>Magazine manifest URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[magazine_manifest_url]" value="<?php echo esc_attr( $settings['magazine_manifest_url'] ); ?>" /></label><br><br>
						<label>Articles URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[articles_url]" value="<?php echo esc_attr( $settings['articles_url'] ); ?>" /></label><br><br>
						<label>Chapters URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[chapters_url]" value="<?php echo esc_attr( $settings['chapters_url'] ); ?>" /></label><br><br>
						<label>Front matter URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[front_matter_url]" value="<?php echo esc_attr( $settings['front_matter_url'] ); ?>" /></label><br><br>
						<label>Chapter descriptions URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[chapter_descriptions_url]" value="<?php echo esc_attr( $settings['chapter_descriptions_url'] ); ?>" /></label><br><br>
						<label>Base raw URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[base_raw_url]" value="<?php echo esc_attr( $settings['base_raw_url'] ); ?>" /></label>
						<p class="description">These are fallback URLs only. WordPress content should become primary once the Content Plugin is installed.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Rights metadata</th>
					<td>
						<label>Owner<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[copyright_owner]" value="<?php echo esc_attr( $settings['copyright_owner'] ); ?>" /></label><br><br>
						<label>Permissions email<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[permissions_email]" value="<?php echo esc_attr( $settings['permissions_email'] ); ?>" /></label><br><br>
						<label>License label<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[license_label]" value="<?php echo esc_attr( $settings['license_label'] ); ?>" /></label>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<h2>Shortcode</h2>
		<p>Use this on the WordPress page where the reader should appear:</p>
		<pre><code>[the_words_we_carry-bta-mag]</code></pre>
		<p>Optional height override:</p>
		<pre><code>[the_words_we_carry-bta-mag height="100svh"]</code></pre>
	</div>
	<?php
}

function twwc_bta_mag_reader_display_register_block() {
	if ( ! function_exists( 'register_block_type' ) ) {
		return;
	}

	register_block_type(
		'the-words-we-carry/reader',
		array(
			'api_version'     => 2,
			'render_callback' => 'twwc_bta_mag_reader_display_render_block',
			'attributes'      => array(
				'height' => array(
					'type'    => 'string',
					'default' => '',
				),
			),
		)
	);
}

function twwc_bta_mag_reader_display_render_block( $attributes ) {
	$height = isset( $attributes['height'] ) ? $attributes['height'] : '';

	return twwc_bta_mag_reader_display_shortcode(
		array(
			'height' => $height,
		)
	);
}

function twwc_bta_mag_reader_display_shortcode( $atts ) {
	$settings = twwc_bta_mag_reader_display_get_settings();

	$atts = shortcode_atts(
		array(
			'height'                 => $settings['default_height'],
			'issue'                  => $settings['issue_url'],
			'content_api_url'        => $settings['content_api_url'],
			'legacy_content_api_url' => $settings['legacy_content_api_url'],
			'ads_api_url'            => $settings['ads_api_url'],
			'analytics_api_url'      => $settings['analytics_api_url'],
			'config'               => $settings['config_url'],
			'manifest'             => $settings['magazine_manifest_url'],
			'articles'             => $settings['articles_url'],
			'chapters'             => $settings['chapters_url'],
			'front_matter'         => $settings['front_matter_url'],
			'chapter_descriptions' => $settings['chapter_descriptions_url'],
		),
		$atts,
		'the_words_we_carry-bta-mag'
	);

	$config = array(
		'issueUrl'               => twwc_bta_mag_reader_display_clean_url( $atts['issue'] ),
		'configUrl'              => twwc_bta_mag_reader_display_clean_url( $atts['config'] ),
		'defaultConfigUrl'       => $settings['config_url'],
		'magazineManifestUrl'    => twwc_bta_mag_reader_display_clean_url( $atts['manifest'] ),
		'wordpressMagazineUrl'   => twwc_bta_mag_reader_display_clean_url( $atts['content_api_url'] ),
		'legacyWordPressMagazineUrl' => twwc_bta_mag_reader_display_clean_url( $atts['legacy_content_api_url'] ),
		'sourcePriority'         => array( 'wordpress_content_plugin' ),
		'adsUrl'                 => twwc_bta_mag_reader_display_clean_url( $atts['ads_api_url'] ),
		'analyticsUrl'           => twwc_bta_mag_reader_display_clean_url( $atts['analytics_api_url'] ),
		'pluginUrl'              => TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL,
		'assetsUrl'              => TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL . 'assets/',
		'localManifestUrl'       => TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL . 'assets/publish_manifest.json',
		'localViewerUrl'         => TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL . 'assets/viewer.json',
		'articlesUrl'            => twwc_bta_mag_reader_display_clean_url( $atts['articles'] ),
		'chaptersUrl'            => twwc_bta_mag_reader_display_clean_url( $atts['chapters'] ),
		'frontMatterUrl'         => twwc_bta_mag_reader_display_clean_url( $atts['front_matter'] ),
		'chapterDescriptionsUrl' => twwc_bta_mag_reader_display_clean_url( $atts['chapter_descriptions'] ),
		'baseRawUrl'             => twwc_bta_mag_reader_display_clean_url( $settings['base_raw_url'] ),
		'rights'                 => array(
			'owner'            => $settings['copyright_owner'],
			'copyrightNotice'  => '© ' . gmdate( 'Y' ) . ' ' . $settings['copyright_owner'] . '. All rights reserved.',
			'permissionsEmail' => $settings['permissions_email'],
			'license'          => $settings['license_label'],
		),
	);

	twwc_bta_mag_reader_display_enqueue_assets( $config );

	$height = twwc_bta_mag_reader_display_sanitize_css_size( $atts['height'], $settings['default_height'] );
	$style  = twwc_bta_mag_reader_display_reader_shell_style( $height );

	return $style . "\n" . '<div id="the-words-we-carry-bta-mag-shell" class="the-words-we-carry-bta-mag-shell" data-reader-plugin="display">' .
		'<div id="the-words-we-carry-root" class="the-words-we-carry-root" data-reader-config="' . esc_attr( wp_json_encode( $config ) ) . '"></div>' .
	'</div>';
}

function twwc_bta_mag_reader_display_clean_url( $url ) {
	$url = trim( (string) $url );
	return '' === $url ? '' : esc_url_raw( $url );
}

function twwc_bta_mag_reader_display_enqueue_assets( $config ) {
	$css_file = TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_PATH . 'assets/the-words-we-carry.css';
	$css_url  = TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL . 'assets/the-words-we-carry.css';
	if ( file_exists( $css_file ) ) {
		wp_enqueue_style( TWWC_BTA_MAG_READER_DISPLAY_STYLE_HANDLE, $css_url, array(), filemtime( $css_file ) );
	}

	$js_file = TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_PATH . 'assets/the-words-we-carry.js';
	$js_url  = TWWC_BTA_MAG_READER_DISPLAY_PLUGIN_URL . 'assets/the-words-we-carry.js';
	if ( file_exists( $js_file ) ) {
		wp_register_script( TWWC_BTA_MAG_READER_DISPLAY_SCRIPT_HANDLE, $js_url, array(), filemtime( $js_file ), true );
		wp_localize_script( TWWC_BTA_MAG_READER_DISPLAY_SCRIPT_HANDLE, 'theWordsWeCarryConfig', $config );
		wp_enqueue_script( TWWC_BTA_MAG_READER_DISPLAY_SCRIPT_HANDLE );
	}
}

add_filter( 'script_loader_tag', 'twwc_bta_mag_reader_display_add_module_type', 10, 3 );
function twwc_bta_mag_reader_display_add_module_type( $tag, $handle, $src ) {
	if ( TWWC_BTA_MAG_READER_DISPLAY_SCRIPT_HANDLE !== $handle ) {
		return $tag;
	}

	return '<script type="module" src="' . esc_url( $src ) . '"></script>';
}

function twwc_bta_mag_reader_display_reader_shell_style( $height ) {
	return '
	<style>
		/* BTA Magazine reader page lock: make WordPress behave like the Figma canvas. */
		html:has(#the-words-we-carry-root),
		body:has(#the-words-we-carry-root) {
			overflow-x: hidden !important;
			background: #2C241B !important;
		}

		/* Hide the site/theme chrome on the magazine reader page only. The WordPress
		   admin bar is intentionally not hidden for logged-in editing sessions. */
		body:has(#the-words-we-carry-root) .site-header,
		body:has(#the-words-we-carry-root) #masthead,
		body:has(#the-words-we-carry-root) header[role="banner"],
		body:has(#the-words-we-carry-root) .site-branding,
		body:has(#the-words-we-carry-root) .main-navigation,
		body:has(#the-words-we-carry-root) .primary-navigation,
		body:has(#the-words-we-carry-root) .entry-header,
		body:has(#the-words-we-carry-root) .page-header,
		body:has(#the-words-we-carry-root) .entry-title,
		body:has(#the-words-we-carry-root) .page-title {
			display: none !important;
		}

		/* Remove theme/page spacing so the reader top bar is at the top of the reader,
		   matching the Figma preview instead of being pushed down by WordPress. */
		body:has(#the-words-we-carry-root) .entry-content,
		body:has(#the-words-we-carry-root) .wp-block-post-content,
		body:has(#the-words-we-carry-root) .page-content,
		body:has(#the-words-we-carry-root) .site-content,
		body:has(#the-words-we-carry-root) .content-area,
		body:has(#the-words-we-carry-root) main,
		body:has(#the-words-we-carry-root) article,
		body:has(#the-words-we-carry-root) .hentry,
		body:has(#the-words-we-carry-root) .wp-site-blocks {
			width: 100% !important;
			max-width: none !important;
			margin-top: 0 !important;
			margin-bottom: 0 !important;
			padding-top: 0 !important;
			padding-bottom: 0 !important;
			overflow: visible !important;
		}

		.the-words-we-carry-bta-mag-shell {
			width: 100vw !important;
			max-width: 100vw !important;
			height: ' . esc_html( $height ) . ' !important;
			min-height: ' . esc_html( $height ) . ' !important;
			position: relative !important;
			overflow: hidden !important;
			overflow-x: hidden !important;
			box-sizing: border-box !important;
			margin-top: 0 !important;
			margin-bottom: 0 !important;
			margin-left: calc(50% - 50vw) !important;
			margin-right: calc(50% - 50vw) !important;
			background: #2C241B !important;
		}

		body.admin-bar .the-words-we-carry-bta-mag-shell {
			height: calc(100svh - 32px) !important;
			min-height: calc(100svh - 32px) !important;
		}

		.the-words-we-carry-root,
		#the-words-we-carry-root {
			width: 100% !important;
			max-width: 100% !important;
			height: 100% !important;
			min-height: 100% !important;
			position: relative !important;
			overflow: hidden !important;
			overflow-x: hidden !important;
			display: block !important;
			box-sizing: border-box !important;
			background: #2C241B !important;
		}

		@media (max-width: 782px) {
			body.admin-bar .the-words-we-carry-bta-mag-shell {
				height: calc(100svh - 46px) !important;
				min-height: calc(100svh - 46px) !important;
			}
		}

		@media (max-width: 520px), (max-height: 520px) {
			.the-words-we-carry-bta-mag-shell {
				height: 100svh !important;
				min-height: 100svh !important;
			}
			body.admin-bar .the-words-we-carry-bta-mag-shell {
				height: calc(100svh - 46px) !important;
				min-height: calc(100svh - 46px) !important;
			}
		}
	</style>';
}

function twwc_bta_mag_reader_display_sanitize_css_size( $value, $fallback ) {
	$value = trim( (string) $value );
	if ( preg_match( '/^\d+(\.\d+)?(px|vh|svh|dvh|lvh|%)$/', $value ) ) {
		return $value;
	}
	if ( preg_match( '/^calc\([a-zA-Z0-9\s\.\+\-\*\/\(\)%]+\)$/', $value ) ) {
		return $value;
	}
	if ( preg_match( '/^clamp\([a-zA-Z0-9\s\.,\+\-\*\/\(\)%]+\)$/', $value ) ) {
		return $value;
	}
	return $fallback;
}
