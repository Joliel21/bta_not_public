<?php
/**
 * Plugin Name: The Words We Carry Magazine Content
 * Plugin URI:  https://breathtakingawareness.com/
 * Description: Magazine content, volume, chapter, page, article, media-reference, and rights-data plugin for The Words We Carry. Ads/sponsors and analytics are intentionally separate plugins.
 * Version:     2.1.2
 * Author:      Breathtaking Awareness
 * License:     GPL-2.0+
 * Text Domain: the-words-we-carry-content
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'TWWC_CONTENT_VERSION', '2.1.2' );
define( 'TWWC_CONTENT_REST_NAMESPACE', 'the-words-we-carry-content/v1' );
define( 'TWWC_CONTENT_POST_TYPE', 'twwc_magazine_page' );
define( 'TWWC_CONTENT_ISSUE_POST_TYPE', 'twwc_issue' );
define( 'TWWC_CONTENT_CHAPTER_TAXONOMY', 'twwc_chapter' );
define( 'TWWC_CONTENT_OPTION_KEY', 'twwc_content_settings' );

add_action( 'init', 'twwc_content_register_content_types' );
add_action( 'rest_api_init', 'twwc_content_register_rest_routes' );
add_action( 'admin_init', 'twwc_content_register_settings' );
add_action( 'admin_menu', 'twwc_content_register_settings_page' );
add_action( 'add_meta_boxes', 'twwc_content_add_meta_boxes' );
add_action( 'post_edit_form_tag', 'twwc_content_post_edit_form_tag' );
add_action( 'save_post_' . TWWC_CONTENT_POST_TYPE, 'twwc_content_save_markdown_import', 5 );
add_action( 'save_post_' . TWWC_CONTENT_POST_TYPE, 'twwc_content_save_magazine_page_meta' );
add_action( 'save_post_' . TWWC_CONTENT_ISSUE_POST_TYPE, 'twwc_content_save_issue_meta' );
add_filter( 'manage_' . TWWC_CONTENT_POST_TYPE . '_posts_columns', 'twwc_content_page_columns' );
add_action( 'manage_' . TWWC_CONTENT_POST_TYPE . '_posts_custom_column', 'twwc_content_page_column_content', 10, 2 );
add_filter( 'manage_' . TWWC_CONTENT_ISSUE_POST_TYPE . '_posts_columns', 'twwc_content_issue_columns' );
add_action( 'manage_' . TWWC_CONTENT_ISSUE_POST_TYPE . '_posts_custom_column', 'twwc_content_issue_column_content', 10, 2 );
register_activation_hook( __FILE__, 'twwc_content_activate' );
register_deactivation_hook( __FILE__, 'twwc_content_deactivate' );

function twwc_content_activate() {
	twwc_content_register_content_types();
	flush_rewrite_rules();
	twwc_content_maybe_connect_reader_display_plugin();
}

function twwc_content_deactivate() {
	flush_rewrite_rules();
}

function twwc_content_default_settings() {
	return array(
		'default_issue_id'         => 'the-words-we-carry-volume-1',
		'copyright_owner'         => 'Jolie Lizana / Breathtaking Awareness',
		'permissions_email'       => 'Jolie@BreathtakingAwareness.com',
		'license_label'           => 'All rights reserved',
		'commercial_use'          => 'Prohibited without written permission',
		'redistribution'          => 'Prohibited without written permission',
		'public_permissions_url'  => '',
		'public_privacy_url'      => '',
		'public_terms_url'        => '',
	);
}

function twwc_content_get_settings() {
	$saved = get_option( TWWC_CONTENT_OPTION_KEY, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}

	return wp_parse_args( $saved, twwc_content_default_settings() );
}

function twwc_content_register_settings() {
	register_setting(
		'twwc_content_settings_group',
		TWWC_CONTENT_OPTION_KEY,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'twwc_content_sanitize_settings',
			'default'           => twwc_content_default_settings(),
		)
	);
}

function twwc_content_sanitize_settings( $input ) {
	$defaults = twwc_content_default_settings();
	$input    = is_array( $input ) ? $input : array();
	$output   = array();

	foreach ( $defaults as $key => $default ) {
		$value = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : $default;

		if ( 'permissions_email' === $key ) {
			$output[ $key ] = sanitize_email( $value );
			continue;
		}

		if ( in_array( $key, array( 'public_permissions_url', 'public_privacy_url', 'public_terms_url' ), true ) ) {
			$output[ $key ] = '' === trim( (string) $value ) ? '' : esc_url_raw( $value );
			continue;
		}

		$output[ $key ] = sanitize_text_field( $value );
	}

	return $output;
}

function twwc_content_register_settings_page() {
	add_menu_page(
		'The Words We Carry Content',
		'TWWC Content',
		'edit_posts',
		'twwc-content',
		'twwc_content_render_settings_page',
		'dashicons-book-alt',
		26
	);

	add_submenu_page(
		'twwc-content',
		'Content Settings',
		'Settings',
		'manage_options',
		'twwc-content-settings',
		'twwc_content_render_settings_page'
	);
}

function twwc_content_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$settings = twwc_content_get_settings();
	$key      = TWWC_CONTENT_OPTION_KEY;
	$endpoint = rest_url( TWWC_CONTENT_REST_NAMESPACE . '/magazine' );
	?>
	<div class="wrap">
		<h1>The Words We Carry Magazine Content</h1>
		<p>This plugin owns magazine volumes, chapters, articles, pages, image references, CTA content, placement metadata, and rights metadata. Ads/sponsors and analytics are intentionally separate plugins.</p>

		<h2>Content API endpoint</h2>
		<p>Use this URL in the Reader Display Plugin as the Magazine Content API URL:</p>
		<code><?php echo esc_html( $endpoint ); ?></code>

		<form method="post" action="options.php" style="margin-top: 24px;">
			<?php settings_fields( 'twwc_content_settings_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="twwc_default_issue_id">Default volume ID</label></th>
					<td><input id="twwc_default_issue_id" class="regular-text" name="<?php echo esc_attr( $key ); ?>[default_issue_id]" value="<?php echo esc_attr( $settings['default_issue_id'] ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row">Rights metadata</th>
					<td>
						<label>Copyright owner<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[copyright_owner]" value="<?php echo esc_attr( $settings['copyright_owner'] ); ?>" /></label><br><br>
						<label>Permissions email<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[permissions_email]" value="<?php echo esc_attr( $settings['permissions_email'] ); ?>" /></label><br><br>
						<label>License label<br><input class="regular-text" name="<?php echo esc_attr( $key ); ?>[license_label]" value="<?php echo esc_attr( $settings['license_label'] ); ?>" /></label><br><br>
						<label>Commercial use rule<br><input class="large-text" name="<?php echo esc_attr( $key ); ?>[commercial_use]" value="<?php echo esc_attr( $settings['commercial_use'] ); ?>" /></label><br><br>
						<label>Redistribution rule<br><input class="large-text" name="<?php echo esc_attr( $key ); ?>[redistribution]" value="<?php echo esc_attr( $settings['redistribution'] ); ?>" /></label>
					</td>
				</tr>
				<tr>
					<th scope="row">Public policy URLs</th>
					<td>
						<label>Copyright &amp; Permissions URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[public_permissions_url]" value="<?php echo esc_attr( $settings['public_permissions_url'] ); ?>" /></label><br><br>
						<label>Privacy Policy URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[public_privacy_url]" value="<?php echo esc_attr( $settings['public_privacy_url'] ); ?>" /></label><br><br>
						<label>Terms URL<br><input class="large-text code" name="<?php echo esc_attr( $key ); ?>[public_terms_url]" value="<?php echo esc_attr( $settings['public_terms_url'] ); ?>" /></label>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

function twwc_content_register_content_types() {
	register_post_type(
		TWWC_CONTENT_ISSUE_POST_TYPE,
		array(
			'labels'       => array(
				'name'          => 'Magazine Volumes',
				'singular_name' => 'Magazine Volume',
				'add_new_item'  => 'Add Magazine Volume',
				'edit_item'     => 'Edit Magazine Volume',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => 'twwc-content',
			'menu_icon'    => 'dashicons-book-alt',
			'show_in_rest' => true,
			'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ),
			'has_archive'  => false,
			'rewrite'      => false,
		)
	);

	register_post_type(
		TWWC_CONTENT_POST_TYPE,
		array(
			'labels'       => array(
				'name'          => 'Magazine Content',
				'singular_name' => 'Magazine Content Item',
				'add_new_item'  => 'Add Magazine Content',
				'edit_item'     => 'Edit Magazine Content',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => 'twwc-content',
			'menu_icon'    => 'dashicons-media-document',
			'show_in_rest' => true,
			'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'page-attributes', 'revisions', 'author' ),
			'has_archive'  => false,
			'rewrite'      => false,
		)
	);

	register_taxonomy(
		TWWC_CONTENT_CHAPTER_TAXONOMY,
		array( TWWC_CONTENT_POST_TYPE ),
		array(
			'labels'       => array(
				'name'          => 'Magazine Chapters',
				'singular_name' => 'Magazine Chapter',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => 'twwc-content',
			'show_in_rest' => true,
			'hierarchical' => true,
		)
	);

	foreach ( twwc_content_page_meta_defaults() as $key => $default ) {
		register_post_meta(
			TWWC_CONTENT_POST_TYPE,
			$key,
			array(
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function() {
					return current_user_can( 'edit_posts' );
				},
				'default'           => $default,
			)
		);
	}

	foreach ( twwc_content_issue_meta_defaults() as $key => $default ) {
		register_post_meta(
			TWWC_CONTENT_ISSUE_POST_TYPE,
			$key,
			array(
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function() {
					return current_user_can( 'edit_posts' );
				},
				'default'           => $default,
			)
		);
	}
}

function twwc_content_page_type_options() {
	return array(
		'article'           => 'Article',
		'page'              => 'General Page',
		'front-matter'      => 'Front Matter',
		'back-matter'       => 'Back Matter',
		'inside-back-cover' => 'Inside Back Cover',
		'video'             => 'Video Page',
		'podcast'           => 'Podcast Page',
		'media-page'        => 'Media Page',
		'share'             => 'Share Page',
		'custom'            => 'Custom Page',
	);
}

function twwc_content_page_meta_defaults() {
	return array(
		'_twwc_content_id'          => '',
		'_twwc_issue_id'            => '',
		'_twwc_page_type'           => 'article',
		'_twwc_layout_id'           => 'article-text-layout',
		'_twwc_byline'              => '',
		'_twwc_publication_date'    => '',
		'_twwc_external_image_url'  => '',
		'_twwc_external_image_alt'  => '',
		'_twwc_external_image_caption' => '',
		'_twwc_source_priority'     => 'wordpress',
		'_twwc_placement_mode'      => '',
		'_twwc_placement_target'    => '',
		'_twwc_button_text'         => '',
		'_twwc_button_url'          => '',
		'_twwc_image_click_url'     => '',
		'_twwc_embed_url'           => '',
		'_twwc_audio_url'           => '',
		'_twwc_transcript_url'      => '',
		'_twwc_analytics_label'     => '',
		'_twwc_hotspots_json'       => '',
		'_twwc_accessibility_notes' => '',
	);
}

function twwc_content_issue_meta_defaults() {
	$settings = twwc_content_get_settings();
	return array(
		'_twwc_issue_id'           => $settings['default_issue_id'],
		'_twwc_issue_volume'       => 'Volume I',
		'_twwc_issue_status'       => 'draft',
		'_twwc_issue_fingerprint'  => $settings['default_issue_id'],
		'_twwc_issue_rights_note'  => '',
	);
}

function twwc_content_add_meta_boxes() {
	add_meta_box(
		'twwc_content_markdown_import',
		'Markdown Article Import',
		'twwc_content_render_markdown_import_meta_box',
		TWWC_CONTENT_POST_TYPE,
		'normal',
		'high'
	);

	add_meta_box(
		'twwc_content_page_options',
		'Magazine Content Settings',
		'twwc_content_render_page_meta_box',
		TWWC_CONTENT_POST_TYPE,
		'normal',
		'high'
	);

	add_meta_box(
		'twwc_content_issue_options',
		'Magazine Volume Settings',
		'twwc_content_render_issue_meta_box',
		TWWC_CONTENT_ISSUE_POST_TYPE,
		'normal',
		'high'
	);
}


function twwc_content_post_edit_form_tag( $post ) {
	if ( $post instanceof WP_Post && TWWC_CONTENT_POST_TYPE === $post->post_type ) {
		echo ' enctype="multipart/form-data"';
	}
}

function twwc_content_render_markdown_import_meta_box( $post ) {
	wp_nonce_field( 'twwc_content_markdown_import', 'twwc_content_markdown_import_nonce' );
	?>
	<style>
		.twwc-md-import-box { border: 2px dashed #8c8f94; border-radius: 8px; padding: 16px; background: #fff; max-width: 860px; }
		.twwc-md-import-box.is-dragging { border-color: #2271b1; background: #f0f6fc; }
		.twwc-md-import-box textarea { width: 100%; min-height: 180px; font-family: monospace; margin-top: 10px; }
		.twwc-md-import-help { color: #646970; font-size: 12px; margin: 6px 0 0; }
		.twwc-md-import-status { font-weight: 600; margin-top: 8px; }
	</style>
	<div id="twwc-md-import-box" class="twwc-md-import-box">
		<p><strong>Drop a .md article file here, choose a file, or paste Markdown below.</strong></p>
		<p class="twwc-md-import-help">On Update/Publish, this importer will save the title, subtitle/excerpt, byline, publication date, body, reader content ID, image URL, image alt text, and image caption into the correct WordPress fields.</p>
		<input type="file" id="twwc_markdown_import_file" name="twwc_markdown_import_file" accept=".md,text/markdown,text/plain" />
		<label style="display:block;margin-top:10px;">
			<input type="checkbox" id="twwc_markdown_import_enabled" name="twwc_markdown_import_enabled" value="1" />
			Run Markdown import on next Update/Publish
		</label>
		<textarea id="twwc_markdown_import_raw" name="twwc_markdown_import_raw" placeholder="# Article title&#10;&#10;**Subtitle**&#10;&#10;By Author&#10;&#10;Publication date: Month D, YYYY"></textarea>
		<div id="twwc-md-import-status" class="twwc-md-import-status"></div>
	</div>
	<script>
	(function(){
		var box = document.getElementById('twwc-md-import-box');
		var file = document.getElementById('twwc_markdown_import_file');
		var raw = document.getElementById('twwc_markdown_import_raw');
		var enabled = document.getElementById('twwc_markdown_import_enabled');
		var status = document.getElementById('twwc-md-import-status');
		function setStatus(message) { if (status) { status.textContent = message || ''; } }
		function loadFile(f) {
			if (!f) { return; }
			if (!/\.md$/i.test(f.name) && !/^text\//i.test(f.type || '')) {
				setStatus('This does not look like a Markdown/text file.');
				return;
			}
			var reader = new FileReader();
			reader.onload = function(e) {
				raw.value = String(e.target.result || '');
				enabled.checked = true;
				setStatus('Loaded ' + f.name + '. Click Update/Publish to import it.');
			};
			reader.readAsText(f);
		}
		if (file) {
			file.addEventListener('change', function(){ loadFile(file.files && file.files[0]); });
		}
		if (box) {
			box.addEventListener('dragover', function(e){ e.preventDefault(); box.classList.add('is-dragging'); });
			box.addEventListener('dragleave', function(){ box.classList.remove('is-dragging'); });
			box.addEventListener('drop', function(e){
				e.preventDefault();
				box.classList.remove('is-dragging');
				loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
			});
		}
		if (raw) {
			raw.addEventListener('input', function(){ enabled.checked = raw.value.trim().length > 0; });
		}
	})();
	</script>
	<?php
}

function twwc_content_render_page_meta_box( $post ) {
	wp_nonce_field( 'twwc_content_save_magazine_page_meta', 'twwc_content_page_nonce' );
	$fields = twwc_content_page_meta_defaults();
	$values = array();
	foreach ( $fields as $key => $default ) {
		$values[ $key ] = get_post_meta( $post->ID, $key, true );
		if ( '' === $values[ $key ] ) {
			$values[ $key ] = twwc_content_legacy_meta_value( $post->ID, $key, $default );
		}
	}
	?>
	<style>
		.twwc-content-meta-grid { display:grid; grid-template-columns: 190px 1fr; gap: 10px 14px; align-items:center; }
		.twwc-content-meta-grid input, .twwc-content-meta-grid select, .twwc-content-meta-grid textarea { width:100%; max-width: 760px; }
		.twwc-content-meta-grid textarea { min-height: 110px; font-family: monospace; }
		.twwc-content-help { color:#646970; font-size:12px; margin-top:3px; }
	</style>
	<div class="twwc-content-meta-grid">
		<label for="_twwc_content_id">Reader content ID</label>
		<div><input type="text" name="_twwc_content_id" id="_twwc_content_id" value="<?php echo esc_attr( $values['_twwc_content_id'] ); ?>" placeholder="leave blank to use post slug" /><div class="twwc-content-help">Stable ID used by the reader, placements, share links, and analytics.</div></div>

		<label for="_twwc_issue_id">Volume ID</label>
		<input type="text" name="_twwc_issue_id" id="_twwc_issue_id" value="<?php echo esc_attr( $values['_twwc_issue_id'] ); ?>" placeholder="the-words-we-carry-volume-1" />

		<label for="_twwc_page_type">Page/content type</label>
		<select name="_twwc_page_type" id="_twwc_page_type">
			<?php foreach ( twwc_content_page_type_options() as $type => $label ) : ?>
				<option value="<?php echo esc_attr( $type ); ?>" <?php selected( $values['_twwc_page_type'], $type ); ?>><?php echo esc_html( $label ); ?></option>
			<?php endforeach; ?>
		</select>

		<label for="_twwc_layout_id">Layout ID</label>
		<input type="text" name="_twwc_layout_id" id="_twwc_layout_id" value="<?php echo esc_attr( $values['_twwc_layout_id'] ); ?>" placeholder="article-text-layout" />

		<label for="_twwc_byline">Article byline</label>
		<input type="text" name="_twwc_byline" id="_twwc_byline" value="<?php echo esc_attr( $values['_twwc_byline'] ); ?>" placeholder="Jolie Lizana" />

		<label for="_twwc_publication_date">Publication date</label>
		<input type="text" name="_twwc_publication_date" id="_twwc_publication_date" value="<?php echo esc_attr( $values['_twwc_publication_date'] ); ?>" placeholder="December 12, 2025" />

		<label for="_twwc_external_image_url">Article image URL</label>
		<input type="url" name="_twwc_external_image_url" id="_twwc_external_image_url" value="<?php echo esc_attr( $values['_twwc_external_image_url'] ); ?>" placeholder="https://... or images/articles/..." />

		<label for="_twwc_external_image_alt">Article image alt text</label>
		<textarea name="_twwc_external_image_alt" id="_twwc_external_image_alt"><?php echo esc_textarea( $values['_twwc_external_image_alt'] ); ?></textarea>

		<label for="_twwc_external_image_caption">Article image caption</label>
		<textarea name="_twwc_external_image_caption" id="_twwc_external_image_caption"><?php echo esc_textarea( $values['_twwc_external_image_caption'] ); ?></textarea>

		<label for="_twwc_placement_mode">Placement mode</label>
		<select name="_twwc_placement_mode" id="_twwc_placement_mode">
			<option value="" <?php selected( $values['_twwc_placement_mode'], '' ); ?>>Default order</option>
			<option value="before" <?php selected( $values['_twwc_placement_mode'], 'before' ); ?>>Before target ID</option>
			<option value="after" <?php selected( $values['_twwc_placement_mode'], 'after' ); ?>>After target ID</option>
			<option value="replace" <?php selected( $values['_twwc_placement_mode'], 'replace' ); ?>>Replace target ID</option>
			<option value="hide" <?php selected( $values['_twwc_placement_mode'], 'hide' ); ?>>Hide target ID</option>
		</select>

		<label for="_twwc_placement_target">Placement target ID</label>
		<input type="text" name="_twwc_placement_target" id="_twwc_placement_target" value="<?php echo esc_attr( $values['_twwc_placement_target'] ); ?>" placeholder="article-id-or-page-id" />

		<label for="_twwc_button_text">Button/CTA text</label>
		<input type="text" name="_twwc_button_text" id="_twwc_button_text" value="<?php echo esc_attr( $values['_twwc_button_text'] ); ?>" />

		<label for="_twwc_button_url">Button/CTA URL</label>
		<input type="url" name="_twwc_button_url" id="_twwc_button_url" value="<?php echo esc_attr( $values['_twwc_button_url'] ); ?>" />

		<label for="_twwc_image_click_url">Featured image click URL</label>
		<input type="url" name="_twwc_image_click_url" id="_twwc_image_click_url" value="<?php echo esc_attr( $values['_twwc_image_click_url'] ); ?>" />

		<label for="_twwc_embed_url">Video/embed URL</label>
		<input type="url" name="_twwc_embed_url" id="_twwc_embed_url" value="<?php echo esc_attr( $values['_twwc_embed_url'] ); ?>" placeholder="YouTube, Vimeo, podcast embed URL" />

		<label for="_twwc_audio_url">Direct audio URL</label>
		<input type="url" name="_twwc_audio_url" id="_twwc_audio_url" value="<?php echo esc_attr( $values['_twwc_audio_url'] ); ?>" />

		<label for="_twwc_transcript_url">Transcript URL</label>
		<input type="url" name="_twwc_transcript_url" id="_twwc_transcript_url" value="<?php echo esc_attr( $values['_twwc_transcript_url'] ); ?>" />

		<label for="_twwc_analytics_label">Analytics label</label>
		<input type="text" name="_twwc_analytics_label" id="_twwc_analytics_label" value="<?php echo esc_attr( $values['_twwc_analytics_label'] ); ?>" />

		<label for="_twwc_hotspots_json">Hotspots JSON</label>
		<div><textarea name="_twwc_hotspots_json" id="_twwc_hotspots_json" placeholder='[{"id":"cta","label":"Sign up","url":"https://example.com","ariaLabel":"Sign up for updates"}]'><?php echo esc_textarea( $values['_twwc_hotspots_json'] ); ?></textarea><div class="twwc-content-help">Optional clickable areas/buttons/links. Ads/sponsor-specific placements will move to the Ads/Sponsors Plugin.</div></div>

		<label for="_twwc_accessibility_notes">Accessibility notes</label>
		<textarea name="_twwc_accessibility_notes" id="_twwc_accessibility_notes"><?php echo esc_textarea( $values['_twwc_accessibility_notes'] ); ?></textarea>
	</div>
	<?php
}

function twwc_content_render_issue_meta_box( $post ) {
	wp_nonce_field( 'twwc_content_save_issue_meta', 'twwc_content_issue_nonce' );
	$fields = twwc_content_issue_meta_defaults();
	$values = array();
	foreach ( $fields as $key => $default ) {
		$values[ $key ] = get_post_meta( $post->ID, $key, true );
		if ( '' === $values[ $key ] ) {
			$values[ $key ] = $default;
		}
	}
	?>
	<style>
		.twwc-issue-meta-grid { display:grid; grid-template-columns: 190px 1fr; gap: 10px 14px; align-items:center; }
		.twwc-issue-meta-grid input, .twwc-issue-meta-grid select, .twwc-issue-meta-grid textarea { width:100%; max-width: 760px; }
		.twwc-issue-meta-grid textarea { min-height: 90px; }
	</style>
	<div class="twwc-issue-meta-grid">
		<label for="_twwc_issue_id">Volume ID</label>
		<input type="text" name="_twwc_issue_id" id="_twwc_issue_id" value="<?php echo esc_attr( $values['_twwc_issue_id'] ); ?>" />

		<label for="_twwc_issue_volume">Volume label</label>
		<input type="text" name="_twwc_issue_volume" id="_twwc_issue_volume" value="<?php echo esc_attr( $values['_twwc_issue_volume'] ); ?>" />

		<label for="_twwc_issue_status">Volume status</label>
		<select name="_twwc_issue_status" id="_twwc_issue_status">
			<?php foreach ( array( 'draft', 'preview', 'published', 'archived' ) as $status ) : ?>
				<option value="<?php echo esc_attr( $status ); ?>" <?php selected( $values['_twwc_issue_status'], $status ); ?>><?php echo esc_html( $status ); ?></option>
			<?php endforeach; ?>
		</select>

		<label for="_twwc_issue_fingerprint">Volume fingerprint</label>
		<input type="text" name="_twwc_issue_fingerprint" id="_twwc_issue_fingerprint" value="<?php echo esc_attr( $values['_twwc_issue_fingerprint'] ); ?>" />

		<label for="_twwc_issue_rights_note">Volume rights note</label>
		<textarea name="_twwc_issue_rights_note" id="_twwc_issue_rights_note"><?php echo esc_textarea( $values['_twwc_issue_rights_note'] ); ?></textarea>
	</div>
	<?php
}


function twwc_content_save_markdown_import( $post_id ) {
	if ( ! isset( $_POST['twwc_content_markdown_import_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['twwc_content_markdown_import_nonce'] ) ), 'twwc_content_markdown_import' ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$enabled = isset( $_POST['twwc_markdown_import_enabled'] ) && '1' === sanitize_text_field( wp_unslash( $_POST['twwc_markdown_import_enabled'] ) );
	if ( ! $enabled ) {
		return;
	}

	$raw = '';
	$source_filename = '';
	if ( isset( $_FILES['twwc_markdown_import_file'] ) && is_array( $_FILES['twwc_markdown_import_file'] ) && isset( $_FILES['twwc_markdown_import_file']['tmp_name'] ) && is_uploaded_file( $_FILES['twwc_markdown_import_file']['tmp_name'] ) ) {
		$source_filename = isset( $_FILES['twwc_markdown_import_file']['name'] ) ? sanitize_file_name( wp_unslash( $_FILES['twwc_markdown_import_file']['name'] ) ) : '';
		$raw_file = file_get_contents( $_FILES['twwc_markdown_import_file']['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		if ( false !== $raw_file ) {
			$raw = $raw_file;
		}
	}

	if ( '' === trim( $raw ) && isset( $_POST['twwc_markdown_import_raw'] ) ) {
		$raw = wp_unslash( $_POST['twwc_markdown_import_raw'] );
	}

	$preferred_slug = '';
	if ( $source_filename && preg_match( '/^(.+)\.md$/i', $source_filename, $match ) ) {
		$preferred_slug = sanitize_title( $match[1] );
	}

	$parsed = twwc_content_parse_import_markdown( $raw, $preferred_slug );
	if ( empty( $parsed['body'] ) && empty( $parsed['title'] ) ) {
		return;
	}

	$content_id = $parsed['slug'] ?: sanitize_title( $parsed['title'] );

	$post_update = array( 'ID' => $post_id );
	if ( ! empty( $parsed['title'] ) ) {
		$post_update['post_title'] = $parsed['title'];
	}
	if ( ! empty( $content_id ) ) {
		$post_update['post_name'] = sanitize_title( $content_id );
	}
	if ( isset( $parsed['body'] ) ) {
		$post_update['post_content'] = $parsed['body'];
	}
	if ( ! empty( $parsed['subtitle'] ) ) {
		$post_update['post_excerpt'] = $parsed['subtitle'];
	}

	remove_action( 'save_post_' . TWWC_CONTENT_POST_TYPE, 'twwc_content_save_markdown_import', 5 );
	wp_update_post( $post_update );
	add_action( 'save_post_' . TWWC_CONTENT_POST_TYPE, 'twwc_content_save_markdown_import', 5 );

	$settings = twwc_content_get_settings();
	$import_meta = array(
		'_twwc_content_id'             => $content_id ? sanitize_title( $content_id ) : '',
		'_twwc_issue_id'               => $settings['default_issue_id'],
		'_twwc_page_type'              => 'article',
		'_twwc_layout_id'              => 'article-text-layout',
		'_twwc_source_priority'        => 'wordpress',
		'_twwc_byline'                 => ! empty( $parsed['byline'] ) ? sanitize_text_field( $parsed['byline'] ) : '',
		'_twwc_publication_date'       => ! empty( $parsed['publication_date'] ) ? sanitize_text_field( $parsed['publication_date'] ) : '',
		'_twwc_external_image_url'     => ! empty( $parsed['image_url'] ) ? esc_url_raw( twwc_content_normalize_import_image_url( $parsed['image_url'] ) ) : '',
		'_twwc_external_image_alt'     => ! empty( $parsed['image_alt'] ) ? sanitize_textarea_field( $parsed['image_alt'] ) : '',
		'_twwc_external_image_caption' => ! empty( $parsed['image_caption'] ) ? sanitize_textarea_field( $parsed['image_caption'] ) : '',
		'_twwc_analytics_label'        => ! empty( $parsed['title'] ) ? sanitize_text_field( $parsed['title'] ) : '',
	);

	foreach ( $import_meta as $meta_key => $meta_value ) {
		if ( '' !== $meta_value ) {
			update_post_meta( $post_id, $meta_key, $meta_value );
			$_POST[ $meta_key ] = wp_slash( $meta_value );
		}
	}
}

function twwc_content_parse_import_markdown( $raw, $preferred_slug = '' ) {
	$raw = str_replace( array( "\r\n", "\r" ), "\n", (string) $raw );
	$raw = preg_replace( '/^\xEF\xBB\xBF/', '', $raw );
	$lines = explode( "\n", $raw );
	$parsed = array(
		'slug'             => $preferred_slug ? sanitize_title( $preferred_slug ) : '',
		'title'            => '',
		'subtitle'         => '',
		'byline'           => '',
		'publication_date' => '',
		'image_url'        => '',
		'image_caption'    => '',
		'image_alt'        => '',
		'body'             => '',
	);

	foreach ( $lines as $line ) {
		$trim = trim( $line );
		if ( '' === $parsed['slug'] && preg_match( '/^([A-Za-z0-9._-]+)\.md$/', $trim, $m ) ) {
			$parsed['slug'] = sanitize_title( $m[1] );
			continue;
		}
		if ( '' === $parsed['title'] && preg_match( '/^#\s+(.+)$/', $trim, $m ) ) {
			$parsed['title'] = trim( $m[1] );
			if ( '' === $parsed['slug'] ) {
				$parsed['slug'] = sanitize_title( $parsed['title'] );
			}
			continue;
		}
		if ( '' === $parsed['subtitle'] && preg_match( '/^\*\*(.+)\*\*$/', $trim, $m ) ) {
			$parsed['subtitle'] = trim( $m[1] );
			continue;
		}
		if ( '' === $parsed['byline'] && preg_match( '/^By\s+(.+)$/i', $trim, $m ) ) {
			$parsed['byline'] = trim( $m[1] );
			continue;
		}
		if ( '' === $parsed['publication_date'] && preg_match( '/^(Publication\s+date|Date|Published):\s*(.+)$/i', $trim, $m ) ) {
			$parsed['publication_date'] = trim( $m[2] );
			continue;
		}
		if ( '' === $parsed['image_url'] && preg_match( '/^Image\s*\d*(?:\s+path)?:\s*(.+)$/i', $trim, $m ) ) {
			$parsed['image_url'] = trim( $m[1] );
			continue;
		}
		if ( '' === $parsed['image_caption'] && preg_match( '/^Caption:\s*(.+)$/i', $trim, $m ) ) {
			$parsed['image_caption'] = trim( $m[1] );
			continue;
		}
		if ( '' === $parsed['image_alt'] && preg_match( '/^Alt\s+text:\s*(.+)$/i', $trim, $m ) ) {
			$parsed['image_alt'] = trim( $m[1] );
			continue;
		}
	}

	if ( preg_match( '/!\[([^\]]*)\]\(([^\)]+)\)/', $raw, $m ) ) {
		if ( '' === $parsed['image_alt'] ) {
			$parsed['image_alt'] = trim( $m[1] );
		}
		if ( '' === $parsed['image_url'] ) {
			$parsed['image_url'] = trim( $m[2] );
		}
	}

	if ( '' === $parsed['image_caption'] && preg_match( '/<!--\s*BTA_IMAGE_START\s*-->.*?!\[[^\]]*\]\([^\)]+\)\s*\n+\s*\*([^\n*]+)\*.*?<!--\s*BTA_IMAGE_END\s*-->/is', $raw, $m ) ) {
		$parsed['image_caption'] = trim( $m[1] );
	}

	$body = $raw;
	$body = preg_replace( '/^\s*[A-Za-z0-9._-]+\.md\s*\n+/', '', $body );
	$body = preg_replace( '/^#\s+.+\n+/', '', $body, 1 );
	$body = preg_replace( '/^\*\*.+\*\*\s*\n+/m', '', $body, 1 );
	$body = preg_replace( '/^By\s+.+\n+/mi', '', $body, 1 );
	$body = preg_replace( '/^(Publication\s+date|Date|Published):\s*.+\n+/mi', '', $body, 1 );
	$body = preg_replace( '/^Image\s*\d*(?:\s+path)?:\s*.+\n+/mi', '', $body, 1 );
	$body = preg_replace( '/^Caption:\s*.+\n+/mi', '', $body, 1 );
	$body = preg_replace( '/^Alt\s+text:\s*.+\n+/mi', '', $body, 1 );
	$body = preg_replace( '/##\s*Image\/caption\s+placement.*?(?:\n---\s*\n|\n<!--\s*BTA_IMAGE_START\s*-->)/is', '<!-- BTA_IMAGE_START -->', $body, 1 );
	$body = preg_replace( '/<!--\s*BTA_IMAGE_START\s*-->.*?<!--\s*BTA_IMAGE_END\s*-->\s*/is', '', $body, 1 );
	$body = preg_replace( '/^---\s*\n+/', '', trim( $body ) );
	$body = preg_replace( "/\n{3,}/", "\n\n", $body );
	$parsed['body'] = trim( $body );

	return $parsed;
}

function twwc_content_normalize_import_image_url( $url ) {
	$url = trim( (string) $url );
	if ( '' === $url ) {
		return '';
	}
	if ( preg_match( '#^https?://#i', $url ) ) {
		return $url;
	}
	if ( 0 === strpos( $url, '/wp-content/' ) ) {
		return site_url( $url );
	}
	$url = preg_replace( '#^(\.\./)+#', '', $url );
	$url = ltrim( $url, '/' );
	$url = preg_replace( '#^public/#', '', $url );
	if ( 0 !== strpos( $url, 'images/' ) ) {
		$url = ltrim( $url, '/' );
	}
	return 'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/' . $url;
}

function twwc_content_save_magazine_page_meta( $post_id ) {
	if ( ! isset( $_POST['twwc_content_page_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['twwc_content_page_nonce'] ) ), 'twwc_content_save_magazine_page_meta' ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	foreach ( twwc_content_page_meta_defaults() as $key => $default ) {
		$value = isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : $default;
		$value = twwc_content_sanitize_page_meta_value( $key, $value );
		update_post_meta( $post_id, $key, $value );
	}
}

function twwc_content_save_issue_meta( $post_id ) {
	if ( ! isset( $_POST['twwc_content_issue_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['twwc_content_issue_nonce'] ) ), 'twwc_content_save_issue_meta' ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	foreach ( twwc_content_issue_meta_defaults() as $key => $default ) {
		$value = isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : $default;
		$value = twwc_content_sanitize_issue_meta_value( $key, $value );
		update_post_meta( $post_id, $key, $value );
	}
}

function twwc_content_sanitize_page_meta_value( $key, $value ) {
	if ( in_array( $key, array( '_twwc_button_url', '_twwc_image_click_url', '_twwc_embed_url', '_twwc_audio_url', '_twwc_transcript_url', '_twwc_external_image_url' ), true ) ) {
		return '' === trim( (string) $value ) ? '' : esc_url_raw( $value );
	}

	if ( in_array( $key, array( '_twwc_external_image_alt', '_twwc_external_image_caption', '_twwc_accessibility_notes' ), true ) ) {
		return sanitize_textarea_field( $value );
	}

	if ( '_twwc_hotspots_json' === $key ) {
		return twwc_content_sanitize_json( $value );
	}

	return sanitize_text_field( $value );
}

function twwc_content_sanitize_issue_meta_value( $key, $value ) {
	if ( '_twwc_issue_rights_note' === $key ) {
		return sanitize_textarea_field( $value );
	}

	return sanitize_text_field( $value );
}

function twwc_content_sanitize_json( $value ) {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return '';
	}

	$decoded = json_decode( $value, true );
	if ( JSON_ERROR_NONE !== json_last_error() ) {
		return '';
	}

	return wp_json_encode( $decoded );
}

function twwc_content_register_rest_routes() {
	register_rest_route(
		TWWC_CONTENT_REST_NAMESPACE,
		'/magazine',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'twwc_content_rest_magazine',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		TWWC_CONTENT_REST_NAMESPACE,
		'/issues',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'twwc_content_rest_issues',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		TWWC_CONTENT_REST_NAMESPACE,
		'/health',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'twwc_content_rest_health',
			'permission_callback' => '__return_true',
		)
	);
}

function twwc_content_rest_health() {
	return rest_ensure_response(
		array(
			'ok'          => true,
			'plugin'      => 'the-words-we-carry-content',
			'version'     => TWWC_CONTENT_VERSION,
			'endpoint'    => rest_url( TWWC_CONTENT_REST_NAMESPACE . '/magazine' ),
			'generatedAt' => gmdate( 'c' ),
		)
	);
}

function twwc_content_rest_issues() {
	return rest_ensure_response(
		array(
			'schemaVersion' => '1.0.0',
			'source'        => 'wordpress',
			'generatedAt'   => gmdate( 'c' ),
			'issues'        => twwc_content_get_issues(),
		)
	);
}

function twwc_content_rest_magazine( WP_REST_Request $request ) {
	$issue_id = sanitize_text_field( $request->get_param( 'issue' ) );
	if ( '' === $issue_id ) {
		$settings = twwc_content_get_settings();
		$issue_id = $settings['default_issue_id'];
	}

	$issue    = twwc_content_get_issue( $issue_id );
	$chapters = twwc_content_get_chapters();
	$pages    = twwc_content_get_magazine_pages( $issue_id );

	// During the WordPress content migration, avoid returning an empty endpoint.
	// If no WordPress magazine pages exist yet, serve the live public GitHub
	// content so magazine context is not owned by packaged plugin fallback files.
	if ( empty( $pages ) ) {
		$github_payload = twwc_content_get_github_payload( $issue_id, $issue );
		if ( is_array( $github_payload ) ) {
			return rest_ensure_response( $github_payload );
		}
	}

	return rest_ensure_response(
		array(
			'schemaVersion' => '1.0.0',
			'source'        => 'wordpress',
			'generatedAt'   => gmdate( 'c' ),
			'issueId'       => $issue_id,
			'issue'         => $issue,
			'rights'        => twwc_content_get_rights_payload( $issue ),
			'chapters'      => $chapters,
			'articles'      => array_values( array_filter( $pages, 'twwc_content_is_article_payload' ) ),
			'pages'         => $pages,
			'frontMatter'   => array_values( array_filter( $pages, 'twwc_content_is_front_matter_payload' ) ),
			'backMatter'    => array_values( array_filter( $pages, 'twwc_content_is_back_matter_payload' ) ),
			'overrides'     => array_values( array_filter( array_map( 'twwc_content_page_override', $pages ) ) ),
			'api'           => array(
				'content' => rest_url( TWWC_CONTENT_REST_NAMESPACE . '/magazine' ),
			),
		)
	);
}

function twwc_content_get_github_payload( $issue_id, $issue ) {
	$issue_url = 'https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json';
	$issue_json = twwc_content_fetch_public_json( $issue_url );

	if ( empty( $issue_json ) || ! is_array( $issue_json ) ) {
		return null;
	}

	$article_records = array();
	if ( isset( $issue_json['articles'] ) && is_array( $issue_json['articles'] ) ) {
		$article_records = $issue_json['articles'];
	}

	if ( empty( $article_records ) ) {
		return null;
	}

	$chapter_records = array();
	if ( isset( $issue_json['chapters'] ) && is_array( $issue_json['chapters'] ) ) {
		$chapter_records = $issue_json['chapters'];
	}

	$front_pages = array();
	if ( isset( $issue_json['frontMatterPages'] ) && is_array( $issue_json['frontMatterPages'] ) ) {
		$front_pages = $issue_json['frontMatterPages'];
	}

	$chapter_descriptions = array();
	if ( isset( $issue_json['chapterDescriptions'] ) && is_array( $issue_json['chapterDescriptions'] ) ) {
		$chapter_descriptions = $issue_json['chapterDescriptions'];
	}

	return array(
		'schemaVersion'       => '2.0.0',
		'source'              => 'public-github-issue-json',
		'generatedAt'         => gmdate( 'c' ),
		'issueId'             => isset( $issue_json['issueId'] ) ? $issue_json['issueId'] : $issue_id,
		'issue'               => isset( $issue_json['readerContext']['issue'] ) ? $issue_json['readerContext']['issue'] : $issue,
		'rights'              => twwc_content_get_rights_payload( $issue ),
		'chapters'            => array_values( $chapter_records ),
		'articles'            => array_values( $article_records ),
		'pages'               => array_values( $article_records ),
		'frontMatter'         => array( 'pages' => $front_pages ),
		'backMatter'          => isset( $issue_json['backMatterPages'] ) && is_array( $issue_json['backMatterPages'] ) ? $issue_json['backMatterPages'] : array(),
		'chapterDescriptions' => $chapter_descriptions,
		'magazineManifest'    => $issue_json,
		'issueJson'           => $issue_json,
		'api'                 => array(
			'content' => rest_url( TWWC_CONTENT_REST_NAMESPACE . '/magazine' ),
		),
	);
}

function twwc_content_fetch_public_json( $url ) {
	$response = wp_remote_get(
		$url,
		array(
			'timeout'     => 12,
			'redirection' => 3,
		)
	);

	if ( is_wp_error( $response ) ) {
		return null;
	}

	$status_code = wp_remote_retrieve_response_code( $response );
	if ( 200 !== (int) $status_code ) {
		return null;
	}

	$raw = wp_remote_retrieve_body( $response );
	if ( '' === trim( (string) $raw ) ) {
		return null;
	}

	$decoded = json_decode( $raw, true );
	return is_array( $decoded ) ? $decoded : null;
}

function twwc_content_read_packaged_json( $path ) {
	if ( ! file_exists( $path ) || ! is_readable( $path ) ) {
		return null;
	}

	$raw = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( false === $raw || '' === trim( $raw ) ) {
		return null;
	}

	$decoded = json_decode( $raw, true );
	return is_array( $decoded ) ? $decoded : null;
}

function twwc_content_is_article_payload( $page ) {
	return isset( $page['type'] ) && 'article' === $page['type'];
}

function twwc_content_is_front_matter_payload( $page ) {
	return isset( $page['type'] ) && 'front-matter' === $page['type'];
}

function twwc_content_is_back_matter_payload( $page ) {
	return isset( $page['type'] ) && in_array( $page['type'], array( 'back-matter', 'inside-back-cover' ), true );
}

function twwc_content_get_rights_payload( $issue = null ) {
	$settings = twwc_content_get_settings();
	$fingerprint = is_array( $issue ) && ! empty( $issue['fingerprint'] ) ? $issue['fingerprint'] : $settings['default_issue_id'];
	return array(
		'owner'            => $settings['copyright_owner'],
		'copyrightNotice'  => '© ' . gmdate( 'Y' ) . ' ' . $settings['copyright_owner'] . '. All rights reserved.',
		'permissionsEmail' => $settings['permissions_email'],
		'license'          => $settings['license_label'],
		'commercialUse'    => $settings['commercial_use'],
		'redistribution'   => $settings['redistribution'],
		'permissionsUrl'   => $settings['public_permissions_url'],
		'privacyUrl'       => $settings['public_privacy_url'],
		'termsUrl'         => $settings['public_terms_url'],
		'issueFingerprint' => $fingerprint,
	);
}

function twwc_content_get_issues() {
	$query = new WP_Query(
		array(
			'post_type'      => TWWC_CONTENT_ISSUE_POST_TYPE,
			'post_status'    => array( 'publish', 'draft' ),
			'posts_per_page' => 100,
			'orderby'        => array( 'date' => 'DESC' ),
			'no_found_rows'  => true,
		)
	);

	$issues = array();
	foreach ( $query->posts as $post ) {
		$issues[] = twwc_content_normalize_issue_post( $post );
	}
	wp_reset_postdata();

	return $issues;
}

function twwc_content_get_issue( $issue_id ) {
	$issues = twwc_content_get_issues();
	foreach ( $issues as $issue ) {
		if ( $issue_id === $issue['id'] ) {
			return $issue;
		}
	}

	$settings = twwc_content_get_settings();
	return array(
		'id'          => $issue_id,
		'title'       => 'The Words We Carry',
		'volume'      => 'Volume I',
		'status'      => 'published',
		'fingerprint' => $settings['default_issue_id'],
		'source'      => 'wordpress-default',
	);
}

function twwc_content_normalize_issue_post( $post ) {
	$post_id = $post->ID;
	$thumb_id = get_post_thumbnail_id( $post_id );
	return array(
		'id'          => get_post_meta( $post_id, '_twwc_issue_id', true ) ?: $post->post_name,
		'wpId'        => $post_id,
		'source'      => 'wordpress',
		'title'       => get_the_title( $post ),
		'description' => wp_strip_all_tags( $post->post_content ),
		'excerpt'     => has_excerpt( $post ) ? wp_strip_all_tags( get_the_excerpt( $post ) ) : '',
		'volume'      => get_post_meta( $post_id, '_twwc_issue_volume', true ) ?: '',
		'status'      => get_post_meta( $post_id, '_twwc_issue_status', true ) ?: 'draft',
		'fingerprint' => get_post_meta( $post_id, '_twwc_issue_fingerprint', true ) ?: '',
		'rightsNote'  => get_post_meta( $post_id, '_twwc_issue_rights_note', true ) ?: '',
		'coverImage'  => $thumb_id ? twwc_content_media_payload( $thumb_id, get_the_title( $post ) ) : null,
	);
}

function twwc_content_get_chapters() {
	$terms = get_terms(
		array(
			'taxonomy'   => TWWC_CONTENT_CHAPTER_TAXONOMY,
			'hide_empty' => false,
			'orderby'   => 'name',
			'order'     => 'ASC',
		)
	);

	if ( is_wp_error( $terms ) || empty( $terms ) ) {
		return array();
	}

	return array_map(
		function( $term ) {
			return array(
				'id'          => $term->slug,
				'slug'        => $term->slug,
				'title'       => $term->name,
				'description' => $term->description,
				'count'       => (int) $term->count,
				'source'      => 'wordpress',
			);
		},
		$terms
	);
}

function twwc_content_get_magazine_pages( $issue_id ) {
	$meta_query = array();
	if ( '' !== $issue_id ) {
		$meta_query[] = array(
			'relation' => 'OR',
			array(
				'key'     => '_twwc_issue_id',
				'value'   => $issue_id,
				'compare' => '=',
			),
			array(
				'key'     => '_twwc_issue_id',
				'compare' => 'NOT EXISTS',
			),
			array(
				'key'     => '_twwc_issue_id',
				'value'   => '',
				'compare' => '=',
			),
		);
	}

	$query = new WP_Query(
		array(
			'post_type'      => TWWC_CONTENT_POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => 500,
			'orderby'        => array(
				'menu_order' => 'ASC',
				'date'       => 'ASC',
			),
			'no_found_rows'  => true,
			'meta_query'     => $meta_query,
		)
	);

	$pages = array();
	foreach ( $query->posts as $post ) {
		$pages[] = twwc_content_normalize_page_post( $post );
	}
	wp_reset_postdata();

	return $pages;
}

function twwc_content_normalize_page_post( $post ) {
	$post_id   = $post->ID;
	$terms     = get_the_terms( $post_id, TWWC_CONTENT_CHAPTER_TAXONOMY );
	$chapter   = ( ! is_wp_error( $terms ) && ! empty( $terms ) ) ? array_values( $terms )[0] : null;
	$thumb_id  = get_post_thumbnail_id( $post_id );
	$external_image = $thumb_id ? null : twwc_content_external_image_payload( $post_id, get_the_title( $post ) );
	$page_type = twwc_content_get_page_meta( $post_id, '_twwc_page_type', 'article' );
	$layout_id = twwc_content_get_page_meta( $post_id, '_twwc_layout_id', '' );
	$placement_mode   = twwc_content_get_page_meta( $post_id, '_twwc_placement_mode', '' );
	$placement_target = twwc_content_get_page_meta( $post_id, '_twwc_placement_target', '' );
	$hotspots_json    = twwc_content_get_page_meta( $post_id, '_twwc_hotspots_json', '' );
	$hotspots         = $hotspots_json ? json_decode( $hotspots_json, true ) : array();
	if ( ! is_array( $hotspots ) ) {
		$hotspots = array();
	}

	$body_markdown = twwc_content_html_to_reader_markdown( apply_filters( 'the_content', $post->post_content ) );
	$button_text   = twwc_content_get_page_meta( $post_id, '_twwc_button_text', '' );
	$button_url    = twwc_content_get_page_meta( $post_id, '_twwc_button_url', '' );
	$embed_url     = twwc_content_get_page_meta( $post_id, '_twwc_embed_url', '' );
	$audio_url     = twwc_content_get_page_meta( $post_id, '_twwc_audio_url', '' );
	$transcript_url = twwc_content_get_page_meta( $post_id, '_twwc_transcript_url', '' );

	return array(
		'id'                 => twwc_content_page_id( $post ),
		'wpId'               => $post_id,
		'issueId'            => twwc_content_get_page_meta( $post_id, '_twwc_issue_id', '' ),
		'source'             => 'wordpress',
		'type'               => $page_type,
		'pageType'           => $page_type,
		'layoutId'           => $layout_id,
		'title'              => get_the_title( $post ),
		'subtitle'           => has_excerpt( $post ) ? wp_strip_all_tags( get_the_excerpt( $post ) ) : '',
		'chapter'            => $chapter ? $chapter->slug : 'wordpress',
		'chapterSlug'        => $chapter ? $chapter->slug : 'wordpress',
		'chapterTitle'       => $chapter ? $chapter->name : 'WordPress',
		'author'             => twwc_content_get_page_meta( $post_id, '_twwc_byline', '' ) ?: get_the_author_meta( 'display_name', $post->post_author ),
		'date'               => twwc_content_get_page_meta( $post_id, '_twwc_publication_date', '' ) ?: get_the_date( 'F j, Y', $post ),
		'order'              => (int) $post->menu_order,
		'image'              => $thumb_id ? twwc_content_media_payload( $thumb_id, get_the_title( $post ) ) : $external_image,
		'imageUrl'           => $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'full' ) : ( $external_image ? $external_image['url'] : '' ),
		'imageAlt'           => $thumb_id ? get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : ( $external_image ? $external_image['alt'] : get_the_title( $post ) ),
		'imageCaption'       => $thumb_id ? wp_get_attachment_caption( $thumb_id ) : ( $external_image ? $external_image['caption'] : '' ),
		'imageLinkUrl'       => twwc_content_get_page_meta( $post_id, '_twwc_image_click_url', '' ),
		'buttonText'         => $button_text,
		'buttonUrl'          => $button_url,
		'embedUrl'           => $embed_url,
		'audioUrl'           => $audio_url,
		'transcriptUrl'      => $transcript_url,
		'analyticsLabel'     => twwc_content_get_page_meta( $post_id, '_twwc_analytics_label', '' ) ?: get_the_title( $post ),
		'hotspots'           => $hotspots,
		'placement'          => $placement_mode && $placement_target ? array( $placement_mode => $placement_target ) : null,
		'body'               => $body_markdown,
		'content'            => $body_markdown,
		'blocks'             => array(
			array(
				'type'    => 'markdown',
				'content' => $body_markdown,
			),
		),
		'permalink'          => get_permalink( $post ),
		'accessibilityNotes' => twwc_content_get_page_meta( $post_id, '_twwc_accessibility_notes', '' ),
	);
}


function twwc_content_external_image_payload( $post_id, $fallback_alt = '' ) {
	$url = twwc_content_get_page_meta( $post_id, '_twwc_external_image_url', '' );
	if ( '' === $url ) {
		return null;
	}
	$alt = twwc_content_get_page_meta( $post_id, '_twwc_external_image_alt', '' );
	$caption = twwc_content_get_page_meta( $post_id, '_twwc_external_image_caption', '' );
	return array(
		'id'      => 'external-' . $post_id,
		'url'     => esc_url_raw( $url ),
		'alt'     => $alt ?: $fallback_alt,
		'caption' => $caption,
		'title'   => $fallback_alt,
		'source'  => 'external',
	);
}

function twwc_content_media_payload( $attachment_id, $fallback_alt = '' ) {
	$image_post = get_post( $attachment_id );
	return array(
		'id'      => $attachment_id,
		'url'     => wp_get_attachment_image_url( $attachment_id, 'full' ),
		'alt'     => get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) ?: $fallback_alt,
		'caption' => $image_post ? $image_post->post_excerpt : '',
		'title'   => $image_post ? $image_post->post_title : '',
	);
}

function twwc_content_page_id( $post ) {
	$custom_id = get_post_meta( $post->ID, '_twwc_content_id', true );
	if ( $custom_id ) {
		return sanitize_title( $custom_id );
	}

	return $post->post_name ?: 'wp-' . $post->ID;
}

function twwc_content_get_page_meta( $post_id, $key, $default = '' ) {
	$value = get_post_meta( $post_id, $key, true );
	if ( '' !== $value ) {
		return $value;
	}

	return twwc_content_legacy_meta_value( $post_id, $key, $default );
}

function twwc_content_legacy_meta_value( $post_id, $key, $default = '' ) {
	$legacy_map = array(
		'_twwc_content_id'          => '_twwc_content_id',
		'_twwc_issue_id'            => '_twwc_issue_id',
		'_twwc_page_type'           => '_twwc_page_type',
		'_twwc_byline'              => '_twwc_byline',
		'_twwc_publication_date'    => '_twwc_publication_date',
		'_twwc_external_image_url'  => '_twwc_external_image_url',
		'_twwc_external_image_alt'  => '_twwc_external_image_alt',
		'_twwc_external_image_caption' => '_twwc_external_image_caption',
		'_twwc_source_priority'     => '_twwc_source_priority',
		'_twwc_placement_mode'      => '_twwc_placement_mode',
		'_twwc_placement_target'    => '_twwc_placement_target',
		'_twwc_button_text'         => '_twwc_button_text',
		'_twwc_button_url'          => '_twwc_button_url',
		'_twwc_image_click_url'     => '_twwc_image_click_url',
		'_twwc_embed_url'           => '_twwc_embed_url',
		'_twwc_audio_url'           => '_twwc_audio_url',
		'_twwc_analytics_label'     => '_twwc_analytics_label',
		'_twwc_hotspots_json'       => '_twwc_hotspots_json',
	);

	if ( isset( $legacy_map[ $key ] ) ) {
		$legacy = get_post_meta( $post_id, $legacy_map[ $key ], true );
		if ( '' !== $legacy ) {
			return $legacy;
		}
	}

	return $default;
}

function twwc_content_page_override( $page ) {
	if ( empty( $page['placement'] ) || ! is_array( $page['placement'] ) ) {
		return null;
	}

	if ( isset( $page['placement']['replace'] ) ) {
		return array(
			'targetId' => $page['placement']['replace'],
			'action'   => 'replace',
			'withId'  => $page['id'],
			'source'  => 'wordpress',
		);
	}

	if ( isset( $page['placement']['hide'] ) ) {
		return array(
			'targetId' => $page['placement']['hide'],
			'action'   => 'hide',
			'source'  => 'wordpress',
		);
	}

	return null;
}

function twwc_content_html_to_reader_markdown( $html ) {
	$html = preg_replace( '/<\s*br\s*\/?>/i', "\n", $html );
	$html = preg_replace( '/<\/p\s*>/i', "\n\n", $html );
	$html = preg_replace( '/<h1[^>]*>(.*?)<\/h1>/is', "# $1\n\n", $html );
	$html = preg_replace( '/<h2[^>]*>(.*?)<\/h2>/is', "## $1\n\n", $html );
	$html = preg_replace( '/<h3[^>]*>(.*?)<\/h3>/is', "### $1\n\n", $html );
	$html = preg_replace( '/<h4[^>]*>(.*?)<\/h4>/is', "#### $1\n\n", $html );
	$html = preg_replace( '/<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', '[$2]($1)', $html );
	$text = wp_strip_all_tags( $html, true );
	$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = preg_replace( "/\n{3,}/", "\n\n", $text );
	return trim( $text );
}

function twwc_content_page_columns( $columns ) {
	$columns['twwc_type']  = 'Type';
	$columns['twwc_issue'] = 'Volume';
	$columns['twwc_order'] = 'Order';
	return $columns;
}

function twwc_content_page_column_content( $column, $post_id ) {
	if ( 'twwc_type' === $column ) {
		echo esc_html( twwc_content_get_page_meta( $post_id, '_twwc_page_type', 'article' ) );
	}
	if ( 'twwc_issue' === $column ) {
		echo esc_html( twwc_content_get_page_meta( $post_id, '_twwc_issue_id', '' ) );
	}
	if ( 'twwc_order' === $column ) {
		echo esc_html( get_post_field( 'menu_order', $post_id ) );
	}
}

function twwc_content_issue_columns( $columns ) {
	$columns['twwc_issue_id'] = 'Volume ID';
	$columns['twwc_status']   = 'Status';
	return $columns;
}

function twwc_content_issue_column_content( $column, $post_id ) {
	if ( 'twwc_issue_id' === $column ) {
		echo esc_html( get_post_meta( $post_id, '_twwc_issue_id', true ) );
	}
	if ( 'twwc_status' === $column ) {
		echo esc_html( get_post_meta( $post_id, '_twwc_issue_status', true ) );
	}
}

function twwc_content_maybe_connect_reader_display_plugin() {
	$reader_option_key = 'twwc_reader_display_settings';
	$settings          = get_option( $reader_option_key, null );

	if ( ! is_array( $settings ) ) {
		return;
	}

	$settings['content_api_url'] = rest_url( TWWC_CONTENT_REST_NAMESPACE . '/magazine' );
	update_option( $reader_option_key, $settings );
}
