const INVENTORY_ROLES = Object.freeze(['admin', 'manager', 'viewer']);
const INVENTORY_WRITE_ROLES = Object.freeze(['admin', 'manager']);

function hasRole(user, roles) {
  return Boolean(user?.role && roles.includes(user.role));
}

function canReadInventory(user) {
  return hasRole(user, INVENTORY_ROLES);
}

function canWriteInventory(user) {
  return hasRole(user, INVENTORY_WRITE_ROLES);
}

function canDeleteInventory(user) {
  return user?.role === 'admin';
}

module.exports = {
  INVENTORY_ROLES,
  INVENTORY_WRITE_ROLES,
  hasRole,
  canReadInventory,
  canWriteInventory,
  canDeleteInventory
};
