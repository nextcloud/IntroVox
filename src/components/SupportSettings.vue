<template>
	<div class="support-settings">
		<!-- Section 1: About IntroVox -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'About IntroVox') }}</h2>
			<p class="settings-section-desc">
				{{ t('introvox', 'IntroVox is free and open source (AGPL-3.0), with no user limit and no paid features. Everything the app does is available to everyone.') }}
			</p>
		</div>

		<!-- Section 2: Discover the other apps -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'Do you value this app?') }}</h2>
			<p class="settings-section-desc">
				{{ t('introvox', 'IntroVox is part of a range of apps that extend Nextcloud — from intranet and metadata to room booking and forms. One coherent experience, all open source.') }}
			</p>
			<div class="cta-block">
				<NcButton type="primary"
					:href="appsUrl"
					target="_blank"
					rel="noopener noreferrer">
					{{ t('introvox', 'See the other apps') }}
				</NcButton>
			</div>
		</div>

		<!-- Section 3: Help -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'Need help?') }}</h2>
			<p class="settings-section-desc">
				{{ t('introvox', 'Run into a problem or missing something? Report it on GitHub and we will take a look.') }}
			</p>
			<div class="cta-block">
				<NcButton type="secondary"
					href="https://github.com/nextcloud/IntroVox/issues"
					target="_blank"
					rel="noopener noreferrer">
					{{ t('introvox', 'Report an issue') }}
				</NcButton>
				<NcButton type="tertiary"
					href="https://github.com/nextcloud/IntroVox"
					target="_blank"
					rel="noopener noreferrer">
					{{ t('introvox', 'Source code') }}
				</NcButton>
				<p class="cta-contact">
					{{ t('introvox', 'Questions?') }}
					<a href="mailto:info@voxcloud.nl">info@voxcloud.nl</a>
				</p>
			</div>
		</div>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'

export default {
	name: 'SupportSettings',

	components: {
		NcButton,
	},

	computed: {
		appsUrl() {
			const lang = (window.document?.documentElement?.lang || '').split('-')[0]
			return lang === 'nl' ? 'https://voxcloud.nl/#apps' : 'https://voxcloud.nl/en/#apps'
		},
	},

	methods: {
		t(app, text, vars) {
			if (typeof OC !== 'undefined' && OC.L10N) {
				return OC.L10N.translate(app, text, vars)
			}
			if (vars) {
				return Object.keys(vars).reduce((result, key) => {
					return result.replace(`{${key}}`, vars[key])
				}, text)
			}
			return text
		},
	},
}
</script>

<style scoped>
.support-settings {
	max-width: 800px;
}

.settings-section {
	margin-bottom: 32px;
}

.settings-section h2 {
	font-size: 20px;
	font-weight: bold;
	margin-bottom: 8px;
}

.settings-section-desc {
	color: var(--color-text-maxcontrast);
	margin-bottom: 20px;
}

.cta-block {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
	margin-top: 16px;
}

.cta-contact {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cta-contact a {
	color: var(--color-primary-element);
	font-weight: 500;
	text-decoration: none;
}

.cta-contact a:hover {
	text-decoration: underline;
}
</style>
