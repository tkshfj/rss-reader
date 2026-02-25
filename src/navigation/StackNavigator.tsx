// navigation/StackNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import Components
import HomeScreen from '../components/HomeScreen';
import AuthScreen from '../components/AuthScreen';
import AddFeed from '../components/AddFeed';
import ArticleList from '../components/ArticleList';
import ArticleDetail from '../components/ArticleDetail';
import Bookmarks from '../components/Bookmarks';
import FeedsList from '../components/FeedsList';
import Settings from '../components/Settings';
// Define Navigation Props
export type RootStackParamList = {
  Home: { userId: string };
  Settings: { userId: string };
  AddFeed: { userId: string };
  ArticleList: { feedId: string; feedTitle: string; userId: string };
  ArticleDetail: { articleId: string; userId: string };
  Bookmarks: { userId: string };
  FeedsList: { userId: string };
  SignUp: { email?: string };
};

// Create a stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// StackNavigator component to handle navigation
export const StackNavigator = ({ userId }: { userId: string | null }) => {
  return (
    <Stack.Navigator id={undefined}>
      {userId ? (
        <>
          {/* Screens accessible when user is authenticated */}
          <Stack.Screen name="Home" component={HomeScreen} initialParams={{ userId }} />
          <Stack.Screen name="AddFeed" component={AddFeed} initialParams={{ userId }} />
          <Stack.Screen name="ArticleList" component={ArticleList} initialParams={{ userId }} />
          <Stack.Screen name="ArticleDetail" component={ArticleDetail} initialParams={{ userId }} />
          <Stack.Screen name="Bookmarks" component={Bookmarks} initialParams={{ userId }} />
          <Stack.Screen name="FeedsList" component={FeedsList} initialParams={{ userId }} />
          <Stack.Screen name="Settings" component={Settings} initialParams={{ userId }} />
        </>
      ) : (
        // Screen accessible when user is not authenticated
        <Stack.Screen name="SignUp" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
};
