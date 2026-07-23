<script setup lang="ts">
import { FOOTER_GROUPS, FOOTER_COPYRIGHT } from '@/portal/config/footer'
</script>

<template>
  <footer class="portal-footer">
    <div class="portal-footer__inner">
      <div class="portal-footer__groups">
        <div v-for="(group, idx) in FOOTER_GROUPS" :key="idx" class="portal-footer__group">
          <h4 v-if="group.title" class="portal-footer__group-title">
            {{ group.title }}
          </h4>
          <ul class="portal-footer__links">
            <li v-for="link in group.links" :key="link.label">
              <a :href="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
            </li>
          </ul>
        </div>
      </div>
      <pre class="portal-footer__copyright">{{ FOOTER_COPYRIGHT }}</pre>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.portal-footer {
  background: #f5f7fa;
  border-top: 1px solid #ebeef5;
  padding: 24px 0;
  margin-top: 32px;

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
  }

  &__groups {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px 48px;
  }

  &__group-title {
    font-size: 14px;
    color: #606266;
    margin: 0 0 8px;
  }

  &__links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px 24px;

    a {
      color: #606266;
      font-size: 12px;
      text-decoration: none;

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  &__copyright {
    margin: 16px 0 0;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
    font-size: 12px;
    color: #909399;
    line-height: 1.8;
    white-space: pre-wrap;
    font-family: inherit;
  }
}
</style>
