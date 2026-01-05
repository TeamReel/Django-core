import React from 'react';
// @ts-ignore - Workspace dependencies
import { Modal, Grid, Text, Badge, Stack, Heading } from '@django-core/design-system';
import { Role, PermissionCode } from '../types';

export interface PermissionMatrixProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  allPermissions: PermissionCode[];
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  isOpen,
  onClose,
  roles,
  allPermissions,
}) => {
  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc, perm) => {
    const [module] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, PermissionCode[]>);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Permission Matrix">
      <Stack gap="4">
        <Grid columns={`200px repeat(${roles.length}, 1fr)`} gap="4">
          {/* Header Row */}
          <Text weight="bold">Permission</Text>
          {roles.map(role => (
            <Text key={role.id} weight="bold" style={{ textAlign: 'center' }}>{role.name}</Text>
          ))}

          {/* Permission Rows */}
          {Object.entries(permissionsByModule).map(([module, perms]) => (
            <React.Fragment key={module}>
              <div style={{ gridColumn: `1 / span ${roles.length + 1}`, paddingTop: '8px', paddingBottom: '8px' }}>
                <Heading level={4} style={{ textTransform: 'capitalize' }}>{module}</Heading>
              </div>
              {perms.map(perm => (
                <React.Fragment key={perm}>
                  <Text size="sm" color="secondary">{perm}</Text>
                  {roles.map(role => {
                    const hasPermission = role.permissions.includes(perm);
                    return (
                      <Stack key={`${role.id}-${perm}`} align="center" justify="center">
                        {hasPermission ? (
                          <Badge variant="success" size="sm">Yes</Badge>
                        ) : (
                          <Text size="sm" color="tertiary">-</Text>
                        )}
                      </Stack>
                    );
                  })}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </Grid>
      </Stack>
    </Modal>
  );
};
