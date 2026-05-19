import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import ShowcaseScreen from './screens/ShowcaseScreen';
import BasicsScreen from './screens/BasicsScreen';
import ToolbarScreen from './screens/ToolbarScreen';
import BaselineScreen from './screens/BaselineScreen';
import ThemeScreen from './screens/ThemeScreen';
import ToolPickerScreen from './screens/ToolPickerScreen';
import PencilOnlyScreen from './screens/PencilOnlyScreen';
import ExportsScreen from './screens/ExportsScreen';
import StrokeDataScreen from './screens/StrokeDataScreen';
import EventsScreen from './screens/EventsScreen';
import ModalScreen from './screens/ModalScreen';
import ScrollListScreen from './screens/ScrollListScreen';
import FlatListScreen from './screens/FlatListScreen';
import MountScreen from './screens/MountScreen';

export type RootStackParamList = {
  Home: undefined;
  Showcase: undefined;
  Basics: undefined;
  Toolbar: undefined;
  Baseline: undefined;
  Theme: undefined;
  ToolPicker: undefined;
  PencilOnly: undefined;
  Exports: undefined;
  StrokeData: undefined;
  Events: undefined;
  Modal: undefined;
  ScrollList: undefined;
  FlatListDemo: undefined;
  Mount: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerLargeTitle: false,
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Signature Ink' }}
          />
          <Stack.Screen
            name="Showcase"
            component={ShowcaseScreen}
            options={{ title: 'Showcase' }}
          />
          <Stack.Screen
            name="Basics"
            component={BasicsScreen}
            options={{ title: 'Basics' }}
          />
          <Stack.Screen
            name="Toolbar"
            component={ToolbarScreen}
            options={{ title: 'Toolbar & gaps' }}
          />
          <Stack.Screen
            name="Baseline"
            component={BaselineScreen}
            options={{ title: 'Baseline' }}
          />
          <Stack.Screen
            name="Theme"
            component={ThemeScreen}
            options={{ title: 'Dark / light theme' }}
          />
          <Stack.Screen
            name="ToolPicker"
            component={ToolPickerScreen}
            options={{ title: 'iOS tool picker' }}
          />
          <Stack.Screen
            name="PencilOnly"
            component={PencilOnlyScreen}
            options={{ title: 'Pencil only' }}
          />
          <Stack.Screen
            name="Exports"
            component={ExportsScreen}
            options={{ title: 'Exports & photos' }}
          />
          <Stack.Screen
            name="StrokeData"
            component={StrokeDataScreen}
            options={{ title: 'Stroke data & replay' }}
          />
          <Stack.Screen
            name="Events"
            component={EventsScreen}
            options={{ title: 'Drawing events' }}
          />
          <Stack.Screen
            name="Modal"
            component={ModalScreen}
            options={{ title: 'Inside a Modal' }}
          />
          <Stack.Screen
            name="ScrollList"
            component={ScrollListScreen}
            options={{ title: 'ScrollView (3 signers)' }}
          />
          <Stack.Screen
            name="FlatListDemo"
            component={FlatListScreen}
            options={{ title: 'FlatList (12 rows)' }}
          />
          <Stack.Screen
            name="Mount"
            component={MountScreen}
            options={{ title: 'Mount / remount' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
