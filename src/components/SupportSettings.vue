<template>
	<div class="support-settings">
		<!-- Section 1: About IntroVox + CTA -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'Support IntroVox') }}</h2>
			<p class="settings-section-desc">
				{{ t('introvox', 'IntroVox is free and open source (AGPL-3.0). All features work without a subscription. If IntroVox is valuable to your organization, a subscription supports active development and gives you guaranteed Nextcloud compatibility and email support.') }}
			</p>
			<p class="settings-section-desc subscription-includes">
				{{ t('introvox', 'A subscription includes: guaranteed Nextcloud compatibility, email support, priority bug fixes, and active development.') }}
			</p>
			<div class="cta-block">
				<NcButton type="primary"
					:href="pricingUrl"
					target="_blank"
					rel="noopener noreferrer">
					{{ t('introvox', 'View pricing & plans') }}
				</NcButton>
				<p class="cta-contact">
					{{ t('introvox', 'Questions?') }}
					<a href="mailto:info@voxcloud.nl">info@voxcloud.nl</a>
				</p>
			</div>
		</div>

		<!-- Section 2: Your installation -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'Your installation') }}</h2>

			<div v-if="licenseStats" class="stats-overview">
				<div
					v-for="lang in licenseStats.languagesWithOverrides"
					:key="lang"
					class="language-stat-row">
					<div class="language-info">
						<span class="language-name">{{ getLanguageName(lang) }}</span>
						<span class="language-code">({{ lang }})</span>
					</div>
					<div class="progress-container">
						<div class="progress-bar">
							<div
								class="progress-fill"
								:class="{ exceeded: isLangExceeded(lang) }"
								:style="{ width: getProgressWidth(lang) + '%' }">
							</div>
						</div>
						<span class="step-count">
							{{ licenseStats.stepCounts[lang] || 0 }} / {{ getLimitForLang(lang) }} {{ t('introvox', 'steps') }}
						</span>
					</div>
				</div>

				<div class="total-steps">
					<strong>{{ t('introvox', 'Total') }}:</strong>
					{{ licenseStats.totalSteps }} {{ t('introvox', 'steps') }}
				</div>
			</div>

			<NcNoteCard v-if="licenseStats && licenseStats.hasLicense && licenseStats.licenseValid" type="success">
				{{ t('introvox', 'Subscription active — thank you for supporting IntroVox!') }}
			</NcNoteCard>

			<NcNoteCard v-if="licenseStats && licenseStats.hasLicense && !licenseStats.licenseValid" type="warning">
				{{ t('introvox', 'Subscription key is invalid or expired.') }}
			</NcNoteCard>

			<NcNoteCard v-if="licenseStats && !licenseStats.hasLicense && licenseStats.stepsExceeded" type="warning">
				{{ t('introvox', 'This language has reached the free-tier limit. Existing steps remain editable; new steps require a subscription.') }}
			</NcNoteCard>
		</div>

		<!-- Section 3: Subscription key -->
		<div class="settings-section">
			<h2>{{ t('introvox', 'Subscription key') }}</h2>

			<div class="field-row">
				<input id="license-key"
					v-model="licenseKey"
					type="text"
					:placeholder="t('introvox', 'e.g. IVOX-XXXX-XXXX-XXXX-XXXX')"
					class="contact-input"
					@input="_userEditedLicenseKey = true">
			</div>
			<div class="license-key-actions">
				<NcButton type="primary"
					:disabled="savingLicense"
					@click="saveLicenseKey">
					{{ licenseStep === 'saving' ? t('introvox', 'Saving …') : licenseStep === 'validating' ? t('introvox', 'Validating …') : licenseStep === 'activating' ? t('introvox', 'Activating …') : t('introvox', 'Save & activate') }}
				</NcButton>
				<NcButton v-if="licenseStats && licenseStats.hasLicense"
					type="tertiary"
					:disabled="savingLicense"
					@click="removeLicenseKey">
					{{ t('introvox', 'Remove subscription key') }}
				</NcButton>
			</div>
		</div>

		<div v-if="message" :class="['message', messageType]">
			{{ message }}
		</div>
	</div>
</template>

<script>
import { NcButton, NcNoteCard } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

export default {
	name: 'SupportSettings',

	components: {
		NcButton,
		NcNoteCard,
	},

	emits: ['license-changed'],

	data() {
		return {
			licenseStats: null,
			licenseKey: '',
			savingLicense: false,
			licenseStep: '',
			_userEditedLicenseKey: false,
			message: '',
			messageType: 'success',
		}
	},

	computed: {
		pricingUrl() {
			const lang = (window.document?.documentElement?.lang || '').split('-')[0]
			return lang === 'nl' ? 'https://voxcloud.nl/pricing/#introvox' : 'https://voxcloud.nl/en/pricing/#introvox'
		},
	},

	mounted() {
		this.loadLicenseStats()
	},

	methods: {
		async loadLicenseStats() {
			try {
				const response = await axios.get(generateUrl('/apps/introvox/admin/license/stats'))
				if (response.data.success) {
					this.licenseStats = response.data
					if (this.licenseStats.hasLicense && !this._userEditedLicenseKey) {
						this.licenseKey = this.licenseStats.licenseKeyMasked || ''
					}
				}
			} catch (error) {
				console.error('Failed to load license stats:', error)
			}
		},

		async saveLicenseKey() {
			const key = this.licenseKey.trim()
			if (!key) {
				this.showMessage(this.t('introvox', 'Please enter a subscription key'), 'error')
				return
			}
			this.savingLicense = true
			this.licenseStep = 'saving'
			try {
				const saveRes = await axios.post(generateUrl('/apps/introvox/admin/license/settings'), {
					licenseKey: key,
				})
				if (!saveRes.data.success) {
					this.showMessage(this.t('introvox', 'Failed to save subscription key'), 'error')
					return
				}

				this.licenseStep = 'validating'
				const valRes = await axios.post(generateUrl('/apps/introvox/admin/license/validate'))
				if (valRes.data.valid) {
					this.licenseStep = 'activating'
					await axios.post(generateUrl('/apps/introvox/admin/license/usage'))
					this.showMessage(this.t('introvox', 'Subscription activated!'), 'success')
				} else {
					this.showMessage(this.t('introvox', 'Subscription key saved but validation failed: {reason}', { reason: valRes.data.reason || 'unknown' }), 'error')
				}

				await this.loadLicenseStats()
				this.$emit('license-changed')
			} catch (error) {
				console.error('Failed to save/validate license key:', error)
				this.showMessage(this.t('introvox', 'Failed to save subscription key'), 'error')
			} finally {
				this.savingLicense = false
				this.licenseStep = ''
			}
		},

		async removeLicenseKey() {
			this.savingLicense = true
			try {
				await axios.post(generateUrl('/apps/introvox/admin/license/settings'), {
					licenseKey: '',
				})
				this.licenseKey = ''
				this._userEditedLicenseKey = false
				await this.loadLicenseStats()
				this.$emit('license-changed')
				this.showMessage(this.t('introvox', 'Subscription key removed.'), 'success')
			} catch (error) {
				this.showMessage(this.t('introvox', 'Failed to remove subscription key'), 'error')
			} finally {
				this.savingLicense = false
			}
		},

		getLanguageName(lang) {
			const names = {
				nl: this.t('introvox', 'Dutch'),
				en: this.t('introvox', 'English'),
				de: this.t('introvox', 'German'),
				da: this.t('introvox', 'Danish'),
				fr: this.t('introvox', 'French'),
				sv: this.t('introvox', 'Swedish'),
			}
			return names[lang] || lang
		},

		getLimitForLang(lang) {
			if (!this.licenseStats) return 0
			return this.licenseStats.maxStepsPerLanguage || this.licenseStats.freeLimit
		},

		getProgressWidth(lang) {
			if (!this.licenseStats) return 0
			const count = this.licenseStats.stepCounts[lang] || 0
			const limit = this.getLimitForLang(lang)
			if (!limit) return 0
			return Math.min((count / limit) * 100, 100)
		},

		isLangExceeded(lang) {
			if (!this.licenseStats) return false
			const limit = this.getLimitForLang(lang)
			return (this.licenseStats.stepCounts[lang] || 0) >= limit
		},

		showMessage(text, type) {
			this.message = text
			this.messageType = type
			setTimeout(() => {
				this.message = ''
			}, 5000)
		},

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

.subscription-includes {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.language-stat-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	margin-bottom: 8px;
}

.language-info {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 160px;
}

.language-name {
	font-weight: 500;
}

.language-code {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.progress-container {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	max-width: 400px;
}

.progress-bar {
	flex: 1;
	height: 8px;
	background: var(--color-border);
	border-radius: 4px;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: var(--color-primary);
	border-radius: 4px;
	transition: width 0.3s ease;
}

.progress-fill.exceeded {
	background: var(--color-warning);
}

.step-count {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.total-steps {
	margin-top: 8px;
	font-size: 15px;
}

.stats-overview {
	margin-bottom: 24px;
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

.field-row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 12px;
}

.contact-input {
	width: 100%;
	max-width: 400px;
	padding: 8px 12px;
	border: 2px solid var(--color-border-dark);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 14px;
}

.contact-input:focus {
	border-color: var(--color-primary-element);
	outline: none;
}

.license-key-actions {
	display: flex;
	gap: 8px;
	margin-top: 8px;
}

.message {
	margin-top: 15px;
	padding: 10px 15px;
	border-radius: var(--border-radius);
	font-size: 14px;
}

.message.success {
	background: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

.message.error {
	background: #f8d7da;
	color: #721c24;
	border: 1px solid var(--color-error, #f5c6cb);
}
</style>
