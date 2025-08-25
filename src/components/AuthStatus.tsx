import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { View, Text } from 'react-native';

const AuthStatus = () => {
  const { user, session, isLoading } = useAuth();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      {user ? (
        <Text>Logged in as {user.email}</Text>
      ) : (
        <Text>Not logged in</Text>
      )}
    </View>
  );
};

export default AuthStatus; 