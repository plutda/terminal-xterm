interface TerminalTheme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  description?: string;
}

export const terminalThemes: TerminalTheme[] = [
  {
    id: 'dark',
    name: '深色主题',
    background: '#1e1e1e',
    foreground: '#ffffff',
    cursor: '#ffffff',
    description: '默认深色主题'
  },
  {
    id: 'light',
    name: '浅色主题',
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#333333',
    description: '浅色主题'
  },
  {
    id: 'monokai',
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    description: 'Monokai 配色'
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    description: 'Solarized 深色主题'
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    background: '#fdf6e3',
    foreground: '#000000',
    cursor: '#586e75',
    description: 'Solarized 浅色主题'
  }
];

export const getThemeById = (id: string): TerminalTheme => {
  return terminalThemes.find(theme => theme.id === id) || terminalThemes[0];
}; 