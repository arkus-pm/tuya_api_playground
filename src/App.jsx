import { useState, useEffect } from "react";
import {
  ChakraProvider,
  Box,
  Grid,
  VStack,
  Heading,
  Text,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast,
} from "@chakra-ui/react";
import { tuyaService } from "./services/tuya";

function App() {
  const [devices, setDevices] = useState([]);
  const toast = useToast();

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const devices = await tuyaService.getDevices();
      setDevices(devices);
    } catch (error) {
      toast({
        title: "Error fetching devices",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const toggleDevice = async (deviceId, currentState) => {
    try {
      await tuyaService.toggleDevice(deviceId, currentState);
      // Refresh devices after toggle
      fetchDevices();
    } catch (error) {
      toast({
        title: "Error toggling device",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const setBrightness = async (deviceId, brightness) => {
    try {
      await tuyaService.setBrightness(deviceId, brightness);
      // Refresh devices after brightness change
      fetchDevices();
    } catch (error) {
      toast({
        title: "Error setting brightness",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <ChakraProvider>
      <Box p={8}>
        <VStack spacing={8}>
          <Heading>Tuya Smart Devices</Heading>
          <Grid
            templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
            gap={6}
            width="100%"
          >
            {devices.map((device) => (
              <Box
                key={device.id}
                p={5}
                shadow="md"
                borderWidth="1px"
                borderRadius="lg"
                bg={device.online ? "white" : "gray.100"}
              >
                <VStack align="stretch" spacing={4}>
                  <Heading size="md">{device.name}</Heading>
                  <Text color={device.online ? "green.500" : "red.500"}>
                    {device.online ? "Online" : "Offline"}
                  </Text>

                  {device.online && (
                    <>
                      <Box>
                        <Text mb={2}>Power</Text>
                        <Switch
                          isChecked={
                            device.status.find((s) => s.code === "switch_led")
                              ?.value
                          }
                          onChange={() =>
                            toggleDevice(
                              device.id,
                              device.status.find((s) => s.code === "switch_led")
                                ?.value
                            )
                          }
                        />
                      </Box>

                      <Box>
                        <Text mb={2}>Brightness</Text>
                        <Slider
                          value={
                            device.status.find(
                              (s) => s.code === "bright_value_v2"
                            )?.value || 0
                          }
                          min={0}
                          max={1000}
                          onChange={(value) => setBrightness(device.id, value)}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                      </Box>
                    </>
                  )}
                </VStack>
              </Box>
            ))}
          </Grid>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
