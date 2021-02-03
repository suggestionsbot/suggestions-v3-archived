export const BULLET_POINT = '•';

export const CONFIG_OPTIONS = ['true', 'on', 'false', 'off', 'toggle'];
export const TRUTHY_CONFIG_OPTIONS = ['true', 'on'];
export const FALSEY_CONFIG_OPTIONS = ['false', 'off'];
export const ALLOWED_MENTIONS = {
  everyone: false,
  users: true,
  roles: true,
  repliedUser: true
};

export const IMAGE_URL_REGEX = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/;

export const VIEW_STATUS = (status: boolean, options: [falsey: string, truthy: string]): string => options[+status];
