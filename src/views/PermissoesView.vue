<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Permissões</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-success" @click="saveAll" :disabled="saving">Salvar Alterações</button>
      </div>
    </div>

    <div class="table-wrap" v-if="roles.length && permissions.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>Permissão</th>
            <th v-for="r in roles" :key="r">{{ r }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in permissions" :key="p">
            <td><code>{{ p }}</code></td>
            <td v-for="r in roles" :key="r + '-' + p" style="text-align:center;">
              <input type="checkbox" :checked="has(r,p)" @change="toggle(r,p,$event.target.checked)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <p>Carregando papéis e permissões…</p>
    </div>

    <div v-if="msg" :style="{color: msgType==='err' ? '#dc3545' : '#198754'}" style="margin-top:.5rem;">{{ msg }}</div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listRoles } from '@/services/users'
import { listAllPermissions, listRolePermissions, updateRolePermissions } from '@/services/permissions'

const roles = ref([])
const permissions = ref([])
const roleMap = ref({})
const saving = ref(false)
const msg = ref('')
const msgType = ref('ok')

function has(role, perm){ return Array.isArray(roleMap.value[role]) && roleMap.value[role].includes(perm) }
function toggle(role, perm, checked){
  const arr = roleMap.value[role] ? [...roleMap.value[role]] : []
  const idx = arr.indexOf(perm)
  if (checked && idx < 0) arr.push(perm)
  if (!checked && idx >= 0) arr.splice(idx,1)
  roleMap.value = { ...roleMap.value, [role]: arr }
}

async function load(){
  const [rs, ps, map] = await Promise.all([listRoles(), listAllPermissions(), listRolePermissions()])
  roles.value = rs; permissions.value = ps; roleMap.value = map || {}
}

async function saveAll(){
  saving.value = true; msg.value=''; msgType.value='ok'
  try{
    for(const r of roles.value){ await updateRolePermissions(r, roleMap.value[r] || []) }
    msg.value = 'Permissões salvas.'
  } catch(e){ msg.value = e?.message || 'Falha ao salvar'; msgType.value='err' }
  finally{ saving.value = false }
}

onMounted(async () => { await load() })
</script>
